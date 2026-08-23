'use client';

import { useEffect, useMemo, useRef } from 'react';
import { LngLatBounds } from 'mapbox-gl';
import Map, { GeolocateControl, Marker, NavigationControl, type MapRef } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { CityConfig, CityEvent } from '@/app/lib/types';
import { isLiveVideo } from '@/app/lib/ui';
import EventMarker from './EventMarker';
import UserLocationMarker from './UserLocationMarker';

interface CityMapProps {
  city: CityConfig;
  events: CityEvent[];
  selectedId?: string;
  onSelect: (event: CityEvent) => void;
  userLocation: { longitude: number; latitude: number } | null;
  onUserLocation: (coords: { longitude: number; latitude: number }) => void;
}

function liveVideoSignature(events: CityEvent[]): string {
  return events
    .filter((event) => event.category === 'camera' && isLiveVideo(event))
    .map((event) => event.id)
    .sort()
    .join('|');
}

interface CameraCluster {
  id: string;
  longitude: number;
  latitude: number;
  events: CityEvent[];
}

function clusterCellSize(city: CityConfig): { longitude: number; latitude: number } {
  const longitudeSpan = Math.abs(city.bbox.east - city.bbox.west);
  const latitudeSpan = Math.abs(city.bbox.north - city.bbox.south);
  return {
    longitude: Math.max(longitudeSpan / 14, 0.012),
    latitude: Math.max(latitudeSpan / 14, 0.012),
  };
}

function buildCameraClusters(
  city: CityConfig,
  events: CityEvent[],
  selectedId?: string,
): { markerEvents: CityEvent[]; clusters: CameraCluster[] } {
  const cell = clusterCellSize(city);
  const buckets = new globalThis.Map<string, CityEvent[]>();
  const markerEvents: CityEvent[] = [];

  for (const event of events) {
    const liveCamera = event.category === 'camera' && isLiveVideo(event);
    if (!liveCamera || event.id === selectedId || event.longitude == null || event.latitude == null) {
      markerEvents.push(event);
      continue;
    }

    const key = `${Math.floor(event.longitude / cell.longitude)}:${Math.floor(
      event.latitude / cell.latitude,
    )}`;
    buckets.set(key, [...(buckets.get(key) ?? []), event]);
  }

  const clusters: CameraCluster[] = [];
  for (const [key, bucket] of buckets) {
    if (bucket.length < 4) {
      markerEvents.push(...bucket);
      continue;
    }

    const longitude =
      bucket.reduce((sum: number, event: CityEvent) => sum + (event.longitude ?? 0), 0) /
      bucket.length;
    const latitude =
      bucket.reduce((sum: number, event: CityEvent) => sum + (event.latitude ?? 0), 0) /
      bucket.length;
    clusters.push({
      id: `cluster-${city.id}-${key}`,
      longitude,
      latitude,
      events: bucket,
    });
  }

  return { markerEvents, clusters };
}

export default function CityMap({
  city,
  events,
  selectedId,
  onSelect,
  userLocation,
  onUserLocation,
}: CityMapProps) {
  const mapRef = useRef<MapRef>(null);
  const skipSelectFly = useRef(true);
  const lastLiveSignature = useRef('');
  const token = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  useEffect(() => {
    skipSelectFly.current = true;
    lastLiveSignature.current = '';
  }, [city.id]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const live = events.filter(
      (event) =>
        event.category === 'camera' &&
        isLiveVideo(event) &&
        event.longitude != null &&
        event.latitude != null,
    );
    const signature = liveVideoSignature(live);
    if (signature === lastLiveSignature.current) return;
    lastLiveSignature.current = signature;

    if (live.length < 2) {
      map.flyTo({
        center: [city.longitude, city.latitude],
        zoom: city.zoom,
        duration: 1600,
      });
      return;
    }

    const bounds = new LngLatBounds();
    for (const camera of live) {
      bounds.extend([camera.longitude as number, camera.latitude as number]);
    }
    map.fitBounds(bounds, {
      padding: { top: 72, bottom: 88, left: 48, right: 48 },
      duration: 1600,
      maxZoom: 11,
    });
  }, [city.id, city.latitude, city.longitude, city.zoom, events]);

  useEffect(() => {
    if (!selectedId) return;
    if (skipSelectFly.current) {
      skipSelectFly.current = false;
      return;
    }
    const selected = events.find((event) => event.id === selectedId);
    if (selected?.longitude == null || selected.latitude == null) return;
    mapRef.current?.flyTo({
      center: [selected.longitude, selected.latitude],
      zoom: Math.max(mapRef.current.getZoom(), 12.2),
      duration: 900,
    });
  }, [events, selectedId]);

  const stackedEvents = useMemo(
    () =>
      [...events].sort((a, b) => {
        const score = (event: CityEvent) =>
          Number(event.category === 'camera' && isLiveVideo(event));
        return score(a) - score(b);
      }),
    [events],
  );
  const { markerEvents, clusters } = useMemo(
    () => buildCameraClusters(city, stackedEvents, selectedId),
    [city, selectedId, stackedEvents],
  );

  if (!token) {
    return (
      <div className="flex h-full items-center justify-center bg-black px-8 text-center text-sm break-words text-gray-400">
        Add{' '}
        <code className="mx-1 break-all text-[var(--neon-green)]">
          NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
        </code>{' '}
        to a local <code className="mx-1">.env.local</code> file, then restart the dev server.
      </div>
    );
  }

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={token}
      initialViewState={{
        longitude: city.longitude,
        latitude: city.latitude,
        zoom: city.zoom,
      }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      dragPan
      trackResize
    >
      <NavigationControl position="bottom-right" />
      <GeolocateControl
        position="bottom-right"
        trackUserLocation
        showUserLocation={false}
        onGeolocate={(position) => {
          onUserLocation({
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
          });
        }}
      />
      {userLocation && (
        <UserLocationMarker longitude={userLocation.longitude} latitude={userLocation.latitude} />
      )}
      {markerEvents.map((event) => (
        <EventMarker
          key={event.id}
          event={event}
          selected={event.id === selectedId}
          onSelect={onSelect}
        />
      ))}
      {clusters.map((cluster) => (
        <Marker
          key={cluster.id}
          longitude={cluster.longitude}
          latitude={cluster.latitude}
          anchor="center"
        >
          <button
            type="button"
            onClick={(click) => {
              click.stopPropagation();
              onSelect(cluster.events[0]);
            }}
            className="live-cam-marker flex h-10 min-w-10 flex-col items-center justify-center border border-cyan-100 bg-[#39ff14] px-2 text-center font-bold leading-none text-black shadow-[0_0_18px_rgba(57,255,20,0.72)]"
            title={`${cluster.events.length} live cameras near ${cluster.events[0].title}`}
          >
            <span className="text-sm">{cluster.events.length}</span>
            <span className="text-[7px] tracking-widest">LIVE</span>
          </button>
        </Marker>
      ))}
    </Map>
  );
}

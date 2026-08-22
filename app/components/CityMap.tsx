'use client';

import { useEffect, useMemo, useRef } from 'react';
import { LngLatBounds } from 'mapbox-gl';
import Map, { GeolocateControl, Layer, NavigationControl, Source, type MapMouseEvent, type MapRef } from 'react-map-gl/mapbox';
import type { FeatureCollection, Point } from 'geojson';
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

  const trafficCameras = useMemo(
    () => events.filter((event) => event.category === 'camera' && !isLiveVideo(event)),
    [events],
  );
  const markerEvents = useMemo(
    () => events.filter((event) => event.category !== 'camera' || isLiveVideo(event)),
    [events],
  );
  const cameraGeoJson = useMemo<FeatureCollection<Point>>(
    () => ({
      type: 'FeatureCollection',
      features: trafficCameras.map((camera) => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [camera.longitude as number, camera.latitude as number],
        },
        properties: { id: camera.id, status: camera.cameraStatus ?? 'unknown' },
      })),
    }),
    [trafficCameras],
  );

  const handleCameraClick = (event: MapMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature) return;
    if (feature.layer?.id === 'camera-clusters') {
      const source = mapRef.current?.getSource('traffic-cameras');
      const clusterId = feature.properties?.cluster_id;
      if (!source || source.type !== 'geojson' || clusterId == null) return;
      source.getClusterExpansionZoom(Number(clusterId), (error, zoom) => {
        if (error || zoom == null || feature.geometry.type !== 'Point') return;
        mapRef.current?.easeTo({
          center: feature.geometry.coordinates as [number, number],
          zoom,
          duration: 500,
        });
      });
      return;
    }
    const selected = trafficCameras.find((camera) => camera.id === String(feature.properties?.id));
    if (selected) onSelect(selected);
  };

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

  if (!token) {
    return (
      <div className="flex h-full items-center justify-center bg-black px-8 text-center text-sm text-gray-400">
        Add <code className="mx-1 text-[var(--neon-green)]">NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN</code> to
        a local <code className="mx-1">.env.local</code> file, then restart the dev server.
      </div>
    );
  }

  const stackedEvents = [...markerEvents].sort((a, b) => {
    const score = (event: CityEvent) =>
      Number(event.category === 'camera' && isLiveVideo(event));
    return score(a) - score(b);
  });

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
      interactiveLayerIds={['camera-clusters', 'camera-points']}
      onClick={handleCameraClick}
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
      <Source
        id="traffic-cameras"
        type="geojson"
        data={cameraGeoJson}
        cluster
        clusterMaxZoom={14}
        clusterRadius={48}
      >
        <Layer
          id="camera-clusters"
          type="circle"
          filter={['has', 'point_count']}
          paint={{
            'circle-color': ['step', ['get', 'point_count'], '#0891b2', 20, '#0e7490', 50, '#155e75'],
            'circle-radius': ['step', ['get', 'point_count'], 18, 20, 24, 50, 30],
            'circle-stroke-color': '#67e8f9',
            'circle-stroke-width': 1,
          }}
        />
        <Layer
          id="camera-cluster-count"
          type="symbol"
          filter={['has', 'point_count']}
          layout={{ 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12 }}
          paint={{ 'text-color': '#ecfeff' }}
        />
        <Layer
          id="camera-points"
          type="circle"
          filter={['!', ['has', 'point_count']]}
          paint={{
            'circle-color': [
              'match',
              ['get', 'status'],
              'online',
              '#facc15',
              'offline',
              '#ef4444',
              '#94a3b8',
            ],
            'circle-radius': 7,
            'circle-stroke-color': '#0f172a',
            'circle-stroke-width': 2,
          }}
        />
      </Source>
      {stackedEvents.map((event) => (
        <EventMarker
          key={event.id}
          event={event}
          selected={event.id === selectedId}
          onSelect={onSelect}
        />
      ))}
    </Map>
  );
}

// birddog-app/app/components/Map.tsx
'use client';

import React, { useState, useRef, useCallback, ChangeEvent, useEffect } from 'react';
import Map, { NavigationControl, GeolocateControl, LngLatLike, MapRef, MapMouseEvent, Source, Layer, LngLat } from 'react-map-gl/mapbox';
import * as GeoJSON from 'geojson';
import 'mapbox-gl/dist/mapbox-gl.css';
import GameOverlay from './GameOverlay';
import UserLocationMarker from './UserLocationMarker';
import ExternalDataPoint from './ExternalDataPoint';
import DynamicGameMarker from './DynamicGameMarker';
import { fetchExternalData } from '../utils/mockApi';

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

const DYNAMIC_MARKERS_STORAGE_KEY = 'birddog-dynamicMarkers';
const WATCHED_MARKERS_STORAGE_KEY = 'birddog-watchedMarkerIds';
const INITIAL_VIEW_STATE_STORAGE_KEY = 'birddog-initialViewState';
const MUTED_EXTERNAL_DATA_STORAGE_KEY = 'birddog-mutedExternalDataIds'; // New storage key

type MapInteraction = { type: string; details: any; timestamp: number };
export type OverlayLayer = 'none' | 'heatmap' | 'grid'; // Define possible overlay layers

interface ExternalData {
  id: string;
  longitude: number;
  latitude: number;
  type: 'sensor' | 'event' | 'alert';
  value?: number; // Added value for sensor data monitoring
}

interface DynamicMarkerData {
  id: string;
  longitude: number;
  latitude: number;
  color: string;
  size: number;
  opacity: number;
}

// Helper function to safely extract longitude and latitude from LngLatLike
const getCoordinates = (loc: LngLatLike): { longitude: number; latitude: number } => {
  if (Array.isArray(loc)) {
    return { longitude: loc[0], latitude: loc[1] };
  } else if (loc && typeof loc === 'object' && ('lng' in loc || 'lon' in loc)) {
    const typedLoc = loc as LngLat;
    return { longitude: typedLoc.lng || (typedLoc as any).lon, latitude: typedLoc.lat };
  }
  // Fallback for cases where loc might be null or undefined, or unexpected format
  // This should ideally not be hit if LngLatLike is always valid coordinates
  console.warn("Unexpected LngLatLike format, returning default coordinates:", loc);
  return { longitude: 0, latitude: 0 }; // Or throw an error, depending on desired strictness
};

const InteractiveMap: React.FC = () => {
  const mapRef = useRef<MapRef>(null);
  const [userLocation, setUserLocation] = useState<LngLatLike | null>(null);
  const [lastInteraction, setLastInteraction] = useState<MapInteraction | null>(null);
  const [externalDataPoints, setExternalDataPoints] = useState<ExternalData[]>([]);
  const prevExternalDataPointsRef = useRef<ExternalData[]>([]); // New ref to store previous external data
  const [dynamicMarkers, setDynamicMarkers] = useState<DynamicMarkerData[]>(() => {
    if (typeof window !== 'undefined') {
      const savedMarkers = localStorage.getItem(DYNAMIC_MARKERS_STORAGE_KEY);
      return savedMarkers ? JSON.parse(savedMarkers) : [];
    }
    return [];
  });
  const [watchedMarkerIds, setWatchedMarkerIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const savedWatchedIds = localStorage.getItem(WATCHED_MARKERS_STORAGE_KEY);
      return savedWatchedIds ? new Set(JSON.parse(savedWatchedIds)) : new Set();
    }
    return new Set();
  });
  const [activeOverlayLayer, setActiveOverlayLayer] = useState<OverlayLayer>('none');
  const [eventLogs, setEventLogs] = useState<string[]>([]);
  const [miniGamePrompt, setMiniGamePrompt] = useState<string | null>(null); // New state for mini-game prompt

  // Load initial view state from local storage or use defaults
  const [initialViewState, setInitialViewState] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedViewState = localStorage.getItem(INITIAL_VIEW_STATE_STORAGE_KEY);
      if (savedViewState) {
        try {
          const parsed = JSON.parse(savedViewState);
          return { ...parsed, zoom: parsed.zoom || 10 }; // Ensure zoom is set
        } catch (e) {
          console.error("Failed to parse saved view state from localStorage", e);
        }
      }
    }
    return {
      longitude: -85.7585,
      latitude: 38.2527,
      zoom: 10,
    };
  });

  // New state for muted external data points
  const [mutedExternalDataIds, setMutedExternalDataIds] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const savedMutedIds = localStorage.getItem(MUTED_EXTERNAL_DATA_STORAGE_KEY);
      return savedMutedIds ? new Set(JSON.parse(savedMutedIds)) : new Set();
    }
    return new Set();
  });

  // Save dynamic markers to local storage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DYNAMIC_MARKERS_STORAGE_KEY, JSON.stringify(dynamicMarkers));
    }
  }, [dynamicMarkers]);

  // Save watched marker IDs to local storage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(WATCHED_MARKERS_STORAGE_KEY, JSON.stringify(Array.from(watchedMarkerIds)));
    }
  }, [watchedMarkerIds]);

  // Save muted external data IDs to local storage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(MUTED_EXTERNAL_DATA_STORAGE_KEY, JSON.stringify(Array.from(mutedExternalDataIds)));
    }
  }, [mutedExternalDataIds]);


  // State for contextual marker controls
  const [showMarkerControls, setShowMarkerControls] = useState(false);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [markerControlPosition, setMarkerControlPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // State for external data details pop-up
  const [showExternalDataDetails, setShowExternalDataDetails] = useState(false);
  const [selectedExternalData, setSelectedExternalData] = useState<ExternalData | null>(null);
  const [externalDataControlPosition, setExternalDataControlPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });


  useEffect(() => {
    const getExternalData = async () => {
      const newFetchedData = await fetchExternalData();
      const newMappedData: ExternalData[] = newFetchedData.map(d => ({
        id: d.id,
        longitude: d.location.longitude,
        latitude: d.location.latitude,
        type: d.type,
        value: d.value // Ensure value is mapped
      }));

      // Watchdog logic for external data changes
      const currentData = prevExternalDataPointsRef.current;
      newMappedData.forEach(newData => {
        // Only log alerts if the data point is not muted
        if (!mutedExternalDataIds.has(newData.id)) {
          const oldData = currentData.find(d => d.id === newData.id);

          if (!oldData) {
            // New external data point appeared
            setEventLogs((prevLogs) => [`[Watchdog] New ${newData.type} data point: ${newData.id} detected!`, ...prevLogs].slice(0, 5));
          } else if (newData.type === 'alert' && oldData.type !== 'alert') {
            // A data point changed to an alert type
            setEventLogs((prevLogs) => [`[Watchdog] ALERT! ${newData.id} is now an ALERT!`, ...prevLogs].slice(0, 5));
            // Trigger mini-game scenario if an alert appears in a watched area
            watchedMarkerIds.forEach(watchedId => {
              const watchedMarker = dynamicMarkers.find(m => m.id === watchedId);
              if (watchedMarker) {
                const distance = Math.sqrt(
                  Math.pow(newData.longitude - watchedMarker.longitude, 2) +
                  Math.pow(newData.latitude - watchedMarker.latitude, 2)
                );
                if (distance < 0.01) { // Proximity threshold for watched area
                  setMiniGamePrompt(`Incoming Anomaly Detected! Check alert ${newData.id}!`);
                }
              }
            });
          } else if (newData.type === 'sensor' && oldData.type === 'sensor' && newData.value !== undefined && oldData.value !== undefined) {
            // Sensor value changed significantly
            const valueDiff = Math.abs(newData.value - oldData.value);
            if (valueDiff > 5) { // Threshold for significant change
              setEventLogs((prevLogs) => [`[Watchdog] Sensor ${newData.id} value changed significantly: ${oldData.value} -> ${newData.value}`, ...prevLogs].slice(0, 5));
            }
          }
        }
      });

      setExternalDataPoints(newMappedData);
      prevExternalDataPointsRef.current = newMappedData; // Update ref for next comparison
    };

    getExternalData();
    const interval = setInterval(getExternalData, 5000);
    return () => clearInterval(interval);
  }, [mutedExternalDataIds, externalDataPoints, dynamicMarkers, watchedMarkerIds]); // Added dynamicMarkers and watchedMarkerIds as dependencies


  // Watchdog logic for user location
  const prevUserLocationRef = useRef<LngLatLike | null>(null);
  useEffect(() => {
    if (userLocation && dynamicMarkers.length > 0 && watchedMarkerIds.size > 0) {
      const { longitude: userLng, latitude: userLat } = getCoordinates(userLocation);

      let userInWatchedArea = false;
      watchedMarkerIds.forEach(watchedId => {
        const watchedMarker = dynamicMarkers.find(m => m.id === watchedId);
        if (watchedMarker) {
          const distance = Math.sqrt(
            Math.pow(userLng - watchedMarker.longitude, 2) +
            Math.pow(userLat - watchedMarker.latitude, 2)
          );
          if (distance < 0.01) { // Proximity threshold
            userInWatchedArea = true;
          }
        }
      });

      const prevUserInWatchedArea = prevUserLocationRef.current ? (() => {
        const { longitude: prevLng, latitude: prevLat } = getCoordinates(prevUserLocationRef.current);
        let prevInWatchedArea = false;
        watchedMarkerIds.forEach(watchedId => {
          const watchedMarker = dynamicMarkers.find(m => m.id === watchedId);
          if (watchedMarker) {
            const distance = Math.sqrt(
              Math.pow(prevLng - watchedMarker.longitude, 2) +
              Math.pow(prevLat - watchedMarker.latitude, 2)
            );
            if (distance < 0.01) {
              prevInWatchedArea = true;
            }
          }
        });
        return prevInWatchedArea;
      })() : false;

      if (userInWatchedArea && !prevUserInWatchedArea) {
        setEventLogs((prevLogs) => [`[Watchdog] User entered a watched area!`, ...prevLogs].slice(0, 5));
        setMiniGamePrompt("You've entered a critical zone! Investigate immediately.");
      } else if (!userInWatchedArea && prevUserInWatchedArea) {
        setEventLogs((prevLogs) => [`[Watchdog] User left a watched area.`, ...prevLogs].slice(0, 5));
      }
    }
    prevUserLocationRef.current = userLocation;
  }, [userLocation, dynamicMarkers, watchedMarkerIds]);

  const handleMapClick = (e: MapMouseEvent) => {
    console.log(`Map clicked at:`, e.lngLat);
    setLastInteraction({ type: 'click', details: e.lngLat, timestamp: Date.now() });

    // Save current map view state on click for persistence
    if (mapRef.current) {
      const newViewState = {
        longitude: mapRef.current.getCenter().lng,
        latitude: mapRef.current.getCenter().lat,
        zoom: mapRef.current.getZoom(),
      };
      localStorage.setItem(INITIAL_VIEW_STATE_STORAGE_KEY, JSON.stringify(newViewState));
      setInitialViewState(newViewState); // Update state to reflect saved view
    }


    // Close marker controls and external data details if map is clicked elsewhere
    setShowMarkerControls(false);
    setSelectedMarkerId(null);
    setShowExternalDataDetails(false);
    setSelectedExternalData(null);

    const clickedDynamicMarker = dynamicMarkers.find(marker => {
      const distance = Math.sqrt(
        Math.pow(e.lngLat.lng - marker.longitude, 2) +
        Math.pow(e.lngLat.lat - marker.latitude, 2)
      );
      return distance < 0.005;
    });

    if (clickedDynamicMarker) {
      setWatchedMarkerIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(clickedDynamicMarker.id)) {
          newSet.delete(clickedDynamicMarker.id);
          setEventLogs((prevLogs) => [`Marker ${clickedDynamicMarker.id} unwatched.`, ...prevLogs].slice(0, 5));
        } else {
          newSet.add(clickedDynamicMarker.id);
          setEventLogs((prevLogs) => [`Marker ${clickedDynamicMarker.id} watched.`, ...prevLogs].slice(0, 5));
        }
        return newSet;
      });
    } else {
      const newMarker: DynamicMarkerData = {
        id: `dynamic-${Date.now()}`,
        longitude: e.lngLat.lng,
        latitude: e.lngLat.lat,
        color: '#FF4500', // Default color
        size: 25,          // Default size
        opacity: 1,        // Default opacity
      };
      setDynamicMarkers((prevMarkers) => [...prevMarkers, newMarker]);
      setEventLogs((prevLogs) => [`New dynamic marker ${newMarker.id} added.`, ...prevLogs].slice(0, 5));
    }
  };

  const handleDynamicMarkerClick = useCallback((markerId: string, screenX: number, screenY: number) => {
    console.log(`Dynamic marker ${markerId} clicked!`);
    setShowMarkerControls(true);
    setSelectedMarkerId(markerId);
    setMarkerControlPosition({ x: screenX, y: screenY });
    setEventLogs((prevLogs) => [`Dynamic marker ${markerId} selected.`, ...prevLogs].slice(0, 5));

    // Close external data details if dynamic marker is clicked
    setShowExternalDataDetails(false);
    setSelectedExternalData(null);
  }, []);

  const handleExternalDataClick = useCallback((dataId: string, dataType: 'sensor' | 'event' | 'alert', value: number | undefined, screenX: number, screenY: number) => {
    console.log(`External data point ${dataId} (${dataType}) clicked!`);
    const data = externalDataPoints.find(d => d.id === dataId);
    if (data) {
      setShowExternalDataDetails(true);
      setSelectedExternalData(data);
      setExternalDataControlPosition({ x: screenX, y: screenY });
      setEventLogs((prevLogs) => [`External data point ${dataId} selected.`, ...prevLogs].slice(0, 5));
    }

    // Close dynamic marker controls if external data is clicked
    setShowMarkerControls(false);
    setSelectedMarkerId(null);
  }, [externalDataPoints]);

  const toggleMuteExternalData = useCallback((dataId: string) => {
    setMutedExternalDataIds((prevMutedIds) => {
      const newMutedIds = new Set(prevMutedIds);
      if (newMutedIds.has(dataId)) {
        newMutedIds.delete(dataId);
        setEventLogs((prevLogs) => [`Unmuted external data point: ${dataId}.`, ...prevLogs].slice(0, 5));
      } else {
        newMutedIds.add(dataId);
        setEventLogs((prevLogs) => [`Muted external data point: ${dataId}.`, ...prevLogs].slice(0, 5));
      }
      return newMutedIds;
    });
  }, []);


  const handleMarkerPropertyChange = useCallback((property: 'color' | 'size' | 'opacity', value: string | number) => {
    if (!selectedMarkerId) return;

    setDynamicMarkers((prevMarkers) =>
      prevMarkers.map((marker) =>
        marker.id === selectedMarkerId
          ? { ...marker, [property]: value }
          : marker
      )
    );
    setEventLogs((prevLogs) => [`Marker ${selectedMarkerId} ${property} changed to ${value}.`, ...prevLogs].slice(0, 5));
  }, [selectedMarkerId]);

  // Function to activate world control - recenter map
  const onActivateControl = useCallback(() => {
    if (userLocation && mapRef.current) {
      const { longitude: userLng, latitude: userLat } = getCoordinates(userLocation);
      mapRef.current.flyTo({
        center: [userLng, userLat],
        zoom: 14,
        duration: 2000,
      });
      setEventLogs((prevLogs) => ['Map recentered on user location.', ...prevLogs].slice(0, 5));
    } else if (mapRef.current) {
      mapRef.current.flyTo({
        center: [-85.7585, 38.2527],
        zoom: 10,
        duration: 2000,
      });
      setEventLogs((prevLogs) => ['Map recentered to initial view.', ...prevLogs].slice(0, 5));
    }
  }, [userLocation]);

  // Function to toggle map layers
  const onToggleLayer = useCallback((layerType: OverlayLayer) => {
    setActiveOverlayLayer((prevLayer) => (prevLayer === layerType ? 'none' : layerType));
    setEventLogs((prevLogs) => [`Toggled ${layerType} layer.`, ...prevLogs].slice(0, 5));
  }, []);

  const selectedMarker = selectedMarkerId ? dynamicMarkers.find(m => m.id === selectedMarkerId) : null;

  return (
    <div className="flex-grow relative">
      <Map
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={initialViewState}
        onMoveEnd={(e) => {
          // Save map position when movement ends
          const newViewState = e.viewState;
          localStorage.setItem(INITIAL_VIEW_STATE_STORAGE_KEY, JSON.stringify(newViewState));
          setInitialViewState(newViewState); // Update state
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/satellite-streets-v12"
        dragPan
        trackResize
        onMove={(e) => {
          setLastInteraction({ type: 'move', details: e.viewState, timestamp: Date.now() });
        }}
        onZoom={(e) => {
          setLastInteraction({ type: 'zoom', details: { zoom: e.viewState.zoom }, timestamp: Date.now() });
        }}
        onClick={handleMapClick}

      >
        <NavigationControl position="top-right" />
        <GeolocateControl
          position="top-right"
          trackUserLocation={true}
          showUserLocation={true}
          onGeolocate={(e) => {
            setUserLocation([e.coords.longitude, e.coords.latitude]);
            setLastInteraction({ type: 'geolocate', details: e.coords, timestamp: Date.now() });
          }}
        />
        {userLocation && <UserLocationMarker longitude={getCoordinates(userLocation).longitude} latitude={getCoordinates(userLocation).latitude} />}
        {externalDataPoints.map(data => (
          <ExternalDataPoint key={data.id} data={data} onMute={toggleMuteExternalData} />
        ))}
        {dynamicMarkers.map(marker => (
          <DynamicGameMarker
            key={marker.id}
            id={marker.id}
            longitude={marker.longitude}
            latitude={marker.latitude}
            isWatched={watchedMarkerIds.has(marker.id)}
            onClick={handleDynamicMarkerClick}
            markerColor={marker.color}
            markerSize={marker.size}
            markerOpacity={marker.opacity}
          />
        ))}

        {/* Visual Indicators for Watched Areas */}
        {Array.from(watchedMarkerIds).map(id => {
          const marker = dynamicMarkers.find(m => m.id === id);
          if (marker) {
            const geojson: GeoJSON.Feature<GeoJSON.Point> = {
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: [marker.longitude, marker.latitude],
              },
              properties: {},
            };

            return (
              <Source key={`watched-area-${id}`} id={`watched-area-${id}`} type="geojson" data={geojson}>
                <Layer
                  id={`watched-circle-${id}`}
                  type="circle"
                  paint={{
                    'circle-radius': 50, // Arbitrary size for visual representation
                    'circle-color': '#00FFFF', // Cyan for watched areas
                    'circle-opacity': 0.2,
                    'circle-stroke-width': 2,
                    'circle-stroke-color': '#00FFFF',
                    'circle-stroke-opacity': 0.8,
                  }}
                />
              </Source>
            );
          }
          return null;
        })}
        {/* Placeholder for rendering dynamic layers based on activeOverlayLayer */}
        {activeOverlayLayer === 'heatmap' && <div style={{ /* Heatmap style */ }} />}
        {activeOverlayLayer === 'grid' && <div style={{ /* Grid style */ }} />}
      </Map>
      <GameOverlay
        lastInteraction={lastInteraction}
        onActivateControl={onActivateControl}
        onToggleLayer={onToggleLayer}
        eventLogs={eventLogs}
        miniGamePrompt={miniGamePrompt}
        setMiniGamePrompt={setMiniGamePrompt}
      />
      {showMarkerControls && selectedMarkerId && selectedMarker && (
        <div
          style={{
            position: 'absolute',
            left: markerControlPosition.x + 10, // Offset from click position
            top: markerControlPosition.y + 10,
            backgroundColor: '#333',
            border: '1px solid #FFD700',
            borderRadius: '5px',
            padding: '10px',
            zIndex: 1000,
            color: 'white',
            boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
          }}
        >
          <p className="text-sm font-bold text-yellow-400">Controls for {selectedMarkerId}</p>
          <div className="mt-2">
            <label htmlFor="markerColor" className="block text-xs text-gray-300">Color:</label>
            <input
              type="color"
              id="markerColor"
              value={selectedMarker.color}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleMarkerPropertyChange('color', e.target.value)}
              className="mt-1 w-full h-8 cursor-pointer"
            />
          </div>
          <div className="mt-2">
            <label htmlFor="markerSize" className="block text-xs text-gray-300">Size:</label>
            <input
              type="range"
              id="markerSize"
              min="10"
              max="50"
              value={selectedMarker.size}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleMarkerPropertyChange('size', parseInt(e.target.value))}
              className="mt-1 w-full"
            />
            <span className="text-xs text-gray-400">{(selectedMarker.size * 100).toFixed(0)}%</span>
          </div>
          <div className="mt-2">
            <label htmlFor="markerOpacity" className="block text-xs text-gray-300">Opacity:</label>
            <input
              type="range"
              id="markerOpacity"
              min="0.1"
              max="1"
              step="0.1"
              value={selectedMarker.opacity}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleMarkerPropertyChange('opacity', parseFloat(e.target.value))}
              className="mt-1 w-full"
            />
            <span className="text-xs text-gray-400">{(selectedMarker.opacity * 100).toFixed(0)}%</span>
          </div>
          <button
            onClick={() => {
              setShowMarkerControls(false); // Close controls
            }}
            className="mt-4 bg-purple-600 hover:bg-purple-500 active:bg-purple-800 text-white font-bold py-1 px-2 rounded text-xs transition-all duration-150 ease-in-out"
          >
            Done
          </button>
        </div>
      )}

      {showExternalDataDetails && selectedExternalData && (
        <div
          style={{
            position: 'absolute',
            left: externalDataControlPosition.x + 10,
            top: externalDataControlPosition.y + 10,
            backgroundColor: '#222',
            border: '1px solid #00BFFF',
            borderRadius: '5px',
            padding: '10px',
            zIndex: 1000,
            color: 'white',
            boxShadow: '0 0 10px rgba(0, 191, 255, 0.5)',
          }}
        >
          <p className="text-sm font-bold text-blue-400">Details for {selectedExternalData.id}</p>
          <p className="text-xs text-gray-300">Type: {selectedExternalData.type}</p>
          {selectedExternalData.value !== undefined && (
            <p className="text-xs text-gray-300">Value: {selectedExternalData.value}</p>
          )}
          <p className="text-xs text-gray-300">Lat: {selectedExternalData.latitude.toFixed(4)}</p>
          <p className="text-xs text-gray-300">Lng: {selectedExternalData.longitude.toFixed(4)}</p>
          <button
            onClick={() => toggleMuteExternalData(selectedExternalData.id)}
            className={`mt-4 font-bold py-1 px-2 rounded text-xs transition-all duration-150 ease-in-out ${
              mutedExternalDataIds.has(selectedExternalData.id)
                ? 'bg-yellow-600 hover:bg-yellow-500 active:bg-yellow-800 text-black'
                : 'bg-red-600 hover:bg-red-500 active:bg-red-800 text-white'
            }`}
          >
            {mutedExternalDataIds.has(selectedExternalData.id) ? 'Unmute Alert' : 'Mute Alert'}
          </button>
          <button
            onClick={() => {
              setShowExternalDataDetails(false); // Close details
            }}
            className="mt-2 ml-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-800 text-white font-bold py-1 px-2 rounded text-xs transition-all duration-150 ease-in-out"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};

export default InteractiveMap;
// birddog-app/app/components/DynamicGameMarker.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Marker } from 'react-map-gl/mapbox';

interface DynamicGameMarkerProps {
  id: string; // Unique ID for this marker
  longitude: number;
  latitude: number;
  isWatched?: boolean; // New prop to indicate if the marker is being watched
  onClick?: (markerId: string, screenX: number, screenY: number) => void; // New prop for click handler, with screen coordinates
  markerColor?: string; // New prop for marker color
  markerSize?: number; // New prop for marker size (diameter in px)
  markerOpacity?: number; // New prop for marker opacity (0-1)
}

const DynamicGameMarker: React.FC<DynamicGameMarkerProps> = ({
  id,
  longitude,
  latitude,
  isWatched,
  onClick,
  markerColor = '#FF4500', // Default orange-red
  markerSize = 25, // Default size
  markerOpacity = 1, // Default opacity
}) => {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (isWatched) {
      interval = setInterval(() => {
        setPulse((prev) => !prev);
      }, 700); // Pulse every 700ms
    } else {
      setPulse(false); // Reset pulse when not watched
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isWatched]);

  const boxShadow = isWatched
    ? (pulse ? `0 0 ${markerSize / 1.25}px ${markerSize / 3}px rgba(255, 255, 0, ${markerOpacity}), 0 0 ${markerSize / 2.5}px rgba(255, 69, 0, ${markerOpacity * 0.8})` : `0 0 ${markerSize / 1.66}px ${markerSize / 5}px rgba(255, 255, 0, ${markerOpacity * 0.7}), 0 0 ${markerSize / 2.5}px rgba(255, 69, 0, ${markerOpacity * 0.8})`)
    : `0 0 ${markerSize / 2.5}px rgba(255, 69, 0, ${markerOpacity * 0.8})`;

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(id, event.clientX, event.clientY);
    }
  };

  return (
    <Marker longitude={longitude} latitude={latitude} anchor="center">
      <div
        onClick={handleClick}
        style={{
          backgroundColor: markerColor,
          borderRadius: '50%',
          width: `${markerSize}px`,
          height: `${markerSize}px`,
          border: `3px solid #FFFF00`, // Yellow border for contrast
          boxShadow: boxShadow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: `${markerSize * 0.4}px`, // Scale font with size
          cursor: 'pointer', // Indicate clickable
          transition: 'box-shadow 0.3s ease-in-out, background-color 0.3s ease-in-out, width 0.3s ease-in-out, height 0.3s ease-in-out, opacity 0.3s ease-in-out', // Smooth transitions
          opacity: markerOpacity,
        }}
        title={`Dynamic Marker: ${id}`}
      >
        {/* Simple visual indicator for dynamic marker */}
        <span>DM</span>
      </div>
    </Marker>
  );
};

export default DynamicGameMarker;
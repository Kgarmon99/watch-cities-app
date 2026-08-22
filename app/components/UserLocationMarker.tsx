// birddog-app/app/components/UserLocationMarker.tsx
'use client';

import React from 'react';
import { Marker } from 'react-map-gl/mapbox';

interface UserLocationMarkerProps {
  longitude: number;
  latitude: number;
}

const UserLocationMarker: React.FC<UserLocationMarkerProps> = ({ longitude, latitude }) => {
  return (
    <Marker longitude={longitude} latitude={latitude} anchor="bottom">
      <div
        style={{
          backgroundColor: '#00FF00', // Bright green for a game-like feel
          borderRadius: '50%',
          width: '20px',
          height: '20px',
          border: '2px solid white',
          boxShadow: '0 0 5px rgba(0, 255, 0, 0.7)',
        }}
        title="Your Location"
      />
    </Marker>
  );
};

export default UserLocationMarker;
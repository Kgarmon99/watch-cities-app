import React from 'react';
import { Marker } from 'react-map-gl/mapbox';

interface ExternalDataPointProps {
  data: {
    id: string;
    longitude: number;
    latitude: number;
    type: 'alert' | 'event' | 'info' | 'sensor';
    value?: number;
    timestamp?: string;
  };
  onMute: (id: string) => void;
}

const ExternalDataPoint: React.FC<ExternalDataPointProps> = ({ data, onMute }) => {
  let color = 'gray';
  switch (data.type) {
    case 'alert':
      color = 'red';
      break;
    case 'event':
      color = 'orange';
      break;
    case 'info':
      color = 'blue';
      break;
    case 'sensor':
      color = 'green';
      break;
    default:
      color = 'gray';
  }

  return (
    <Marker longitude={data.longitude} latitude={data.latitude} anchor="bottom">
      <div
        className={`w-4 h-4 rounded-full bg-${color}-500 opacity-75 animate-pulse cursor-pointer`}
        onClick={() => onMute(data.id)}
        title={`ID: ${data.id}, Type: ${data.type}, Value: ${data.value || 'N/A'}`}
      ></div>
    </Marker>
  );
};

export default ExternalDataPoint;

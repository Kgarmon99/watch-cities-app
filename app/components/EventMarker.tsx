'use client';

import { Marker } from 'react-map-gl/mapbox';
import type { CityEvent } from '@/app/lib/types';
import { CATEGORY_META, isLiveVideo } from '@/app/lib/ui';

interface EventMarkerProps {
  event: CityEvent;
  selected: boolean;
  onSelect: (event: CityEvent) => void;
}

export default function EventMarker({ event, selected, onSelect }: EventMarkerProps) {
  if (event.longitude == null || event.latitude == null) return null;
  const meta = CATEGORY_META[event.category];
  const live = event.category === 'camera' && isLiveVideo(event);

  return (
    <Marker longitude={event.longitude} latitude={event.latitude} anchor="center">
      <button
        type="button"
        onClick={(click) => {
          click.stopPropagation();
          onSelect(event);
        }}
        className={
          live
            ? `live-cam-marker relative flex items-center justify-center border font-bold tracking-wide text-black ${
                selected ? 'h-9 px-1.5 text-[9px]' : 'h-7 px-1 text-[8px]'
              }`
            : 'relative flex h-7 w-7 items-center justify-center rounded-full border text-[9px] font-bold tracking-wide text-black'
        }
        style={{
          backgroundColor: live ? '#39ff14' : meta.color,
          borderColor: selected ? '#ffffff' : live ? '#39ff14' : 'rgba(0,0,0,0.6)',
          color: live ? '#04140a' : '#000',
          zIndex: live ? 4 : 1,
          boxShadow: live
            ? undefined
            : selected
              ? `0 0 16px ${meta.color}`
              : `0 0 10px ${meta.color}88`,
        }}
        title={live ? `LIVE · ${event.title}` : event.title}
      >
        {live ? 'LIVE' : meta.short}
      </button>
    </Marker>
  );
}

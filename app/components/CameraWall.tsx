'use client';

import { useEffect, useState } from 'react';
import type { CityEvent } from '@/app/lib/types';
import { cameraSrc, isLiveVideo } from '@/app/lib/ui';
import LivePlayer from './LivePlayer';
import YouTubeLive from './YouTubeLive';

interface CameraWallProps {
  cameras: CityEvent[];
  active: CityEvent | null;
  tick: number;
  onSelect: (event: CityEvent) => void;
  emptyLabel?: string;
}

function CameraStage({ camera, tick }: { camera: CityEvent; tick: number }) {
  const poster = cameraSrc(camera.mediaUrl, tick);

  return (
    <div className="overflow-hidden border border-cyan-400/80 bg-black">
      <div className="relative aspect-video bg-gray-950">
        {camera.streamUrl ? (
          <LivePlayer src={camera.streamUrl} poster={poster} />
        ) : camera.embedUrl ? (
          <YouTubeLive src={camera.embedUrl} title={camera.title} />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] tracking-widest text-red-500">
            NO SIGNAL
          </div>
        )}
        <span className="pointer-events-none absolute left-1 top-1 bg-black/80 px-1 text-[9px] tracking-widest text-cyan-300">
          LIVE VIDEO
        </span>
      </div>
      <p className="truncate px-2 py-1 text-[10px] text-cyan-100">{camera.title}</p>
    </div>
  );
}

function CameraThumb({
  camera,
  selected,
  tick,
  onSelect,
}: {
  camera: CityEvent;
  selected: boolean;
  tick: number;
  onSelect: (event: CityEvent) => void;
}) {
  const [failed, setFailed] = useState(false);
  const src = cameraSrc(camera.mediaUrl, tick);
  const live = isLiveVideo(camera);
  const offline = camera.cameraStatus === 'offline';

  return (
    <button
      type="button"
      onClick={() => onSelect(camera)}
      className={`w-full overflow-hidden border bg-black text-left ${
        selected ? 'border-cyan-300' : live ? 'border-green-500/70' : 'border-cyan-900/70'
      }`}
    >
      <div className="relative aspect-video bg-gray-950">
        {src && !failed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${camera.id}-${tick}`}
            src={src}
            alt={camera.title}
            loading="lazy"
            className="h-full w-full object-cover"
            onLoad={() => setFailed(false)}
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[9px] tracking-widest text-red-500">
            NO SIGNAL
          </div>
        )}
        <span
          className={`absolute left-1 top-1 px-1 text-[8px] tracking-widest ${
            offline ? 'bg-red-600 text-white' : live ? 'bg-green-500 text-black' : 'bg-black/70 text-cyan-300'
          }`}
        >
          {failed || offline ? 'DOWN' : live ? 'LIVE' : 'NO VIDEO'}
        </span>
      </div>
      <p className="truncate px-1 py-0.5 text-[9px] text-gray-300">{camera.title}</p>
    </button>
  );
}

export default function CameraWall({ cameras, active, tick, onSelect, emptyLabel }: CameraWallProps) {
  const [visibleThumbCount, setVisibleThumbCount] = useState(80);

  useEffect(() => {
    setVisibleThumbCount(80);
  }, [cameras]);

  if (cameras.length === 0) {
    return (
      <div className="border border-cyan-900/60 bg-black/80 px-3 py-2 text-[11px] text-gray-500">
        {emptyLabel ?? 'Hunting live cameras...'}
      </div>
    );
  }

  const thumbs = cameras.filter((camera) => camera.id !== active?.id);
  const visibleThumbs = thumbs.slice(0, visibleThumbCount);
  const hiddenThumbCount = thumbs.length - visibleThumbs.length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {active ? (
        <div className="shrink-0 pb-2">
          <CameraStage camera={active} tick={tick} />
        </div>
      ) : null}
      {thumbs.length > 0 ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
          <div className="grid grid-cols-2 gap-2 pb-3">
            {visibleThumbs.map((camera) => (
              <CameraThumb
                key={camera.id}
                camera={camera}
                selected={camera.id === active?.id}
                tick={tick}
                onSelect={onSelect}
              />
            ))}
          </div>
          {hiddenThumbCount > 0 ? (
            <button
              type="button"
              onClick={() => setVisibleThumbCount((count) => count + 80)}
              className="mb-3 w-full border border-cyan-800 bg-black px-3 py-2 text-[10px] uppercase tracking-widest text-cyan-300 hover:border-cyan-400"
            >
              Show 80 more · {hiddenThumbCount} hidden
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

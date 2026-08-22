'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface LivePlayerProps {
  src: string;
  poster?: string;
}

export default function LivePlayer({ src, poster }: LivePlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setFailed(false);
    let hls: Hls | null = null;
    let cancelled = false;

    const play = () => {
      void video.play().catch(() => undefined);
    };

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      play();
      return () => {
        cancelled = true;
        video.removeAttribute('src');
        video.load();
      };
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: false,
        lowLatencyMode: false,
        backBufferLength: 30,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (!cancelled) play();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal && !cancelled) {
          setFailed(true);
        }
      });
      return () => {
        cancelled = true;
        hls?.destroy();
      };
    }

    const fail = setTimeout(() => setFailed(true), 0);
    return () => clearTimeout(fail);
  }, [src]);

  if (failed) {
    return (
      <div className="flex aspect-video h-full w-full items-center justify-center bg-black text-[10px] tracking-widest text-red-500">
        NO SIGNAL
      </div>
    );
  }

  return (
    <video
      key={src}
      ref={videoRef}
      poster={poster}
      muted
      autoPlay
      playsInline
      controls
      className="h-full w-full bg-black object-contain"
    />
  );
}

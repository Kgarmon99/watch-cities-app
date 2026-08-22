'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CITY_LIST, getCity } from '@/app/lib/cities';
import type { CityEvent, CityFeedResponse, CityId, EventCategory, FeedStatus } from '@/app/lib/types';
import { CATEGORY_META, formatClock, isLiveVideo } from '@/app/lib/ui';
import CameraWall from './CameraWall';

const CityMap = dynamic(() => import('./CityMap'), { ssr: false });

const ALL_CATEGORIES = Object.keys(CATEGORY_META) as EventCategory[];

const STATUS_CLASS: Record<FeedStatus, string> = {
  online: 'text-[var(--neon-green)]',
  empty: 'text-yellow-300',
  offline: 'text-[var(--bright-red)]',
  unavailable: 'text-gray-500',
};

export default function WatchCitiesApp() {
  const [cityId, setCityId] = useState<CityId>('louisville');
  const [feed, setFeed] = useState<CityFeedResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<CityEvent | null>(null);
  const [userLocation, setUserLocation] = useState<{ longitude: number; latitude: number } | null>(
    null,
  );
  const [hidden, setHidden] = useState<Set<EventCategory>>(new Set());
  const [clock, setClock] = useState('--:--:--');
  const [cameraTick, setCameraTick] = useState(0);

  const city = getCity(cityId);

  const loadFeed = useCallback(async (id: CityId, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`/api/city-feed?city=${id}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Feed ${response.status}`);
      }
      const payload = (await response.json()) as CityFeedResponse;
      setFeed(payload);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Feed unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed(cityId);
    const interval = setInterval(() => {
      void loadFeed(cityId, true);
    }, 45000);
    return () => clearInterval(interval);
  }, [cityId, loadFeed]);

  useEffect(() => {
    const tick = () => setClock(formatClock(Date.now()));
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCameraTick((tick) => tick + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setSelected(null);
  }, [cityId]);

  const visibleEvents = useMemo(() => {
    return (feed?.events ?? []).filter((event) => !hidden.has(event.category));
  }, [feed, hidden]);

  const mappedEvents = useMemo(
    () => visibleEvents.filter((event) => event.latitude != null && event.longitude != null),
    [visibleEvents],
  );

  const cameras = useMemo(() => {
    return (feed?.events ?? [])
      .filter((event) => event.category === 'camera' && (event.mediaUrl || event.streamUrl || event.embedUrl))
      .sort((a, b) => Number(isLiveVideo(b)) - Number(isLiveVideo(a)));
  }, [feed]);

  const activeCamera = useMemo(() => {
    if (selected?.category === 'camera') {
      return cameras.find((camera) => camera.id === selected.id) ?? selected;
    }
    return cameras.find((camera) => isLiveVideo(camera)) ?? cameras[0] ?? null;
  }, [cameras, selected]);

  useEffect(() => {
    const firstVideo = cameras.find((camera) => isLiveVideo(camera));
    if (!firstVideo) return;
    setSelected((current) => {
      if (current && cameras.some((camera) => camera.id === current.id)) return current;
      return firstVideo;
    });
  }, [cameras]);

  const wallCameras = useMemo(() => {
    const video = cameras.filter((camera) => isLiveVideo(camera));
    const stills = cameras.filter((camera) => !isLiveVideo(camera));
    return [...video, ...stills.slice(0, 6)];
  }, [cameras]);
  const logEvents = visibleEvents.filter((event) => event.category !== 'camera');

  const toggleCategory = (category: EventCategory) => {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <div className="hud-shell flex h-screen flex-col overflow-hidden bg-black text-white">
      <header className="z-20 flex shrink-0 items-center justify-between border-b border-cyan-900/60 bg-black/80 px-4 py-3">
        <div>
          <p className="text-[10px] tracking-[0.35em] text-cyan-400">CTOS // CITY OPERATIONS</p>
          <h1 className="neon-text-green text-2xl leading-none">WATCH CITIES</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden text-right text-[11px] text-cyan-300 sm:block">
            <div>{clock}</div>
            <div className="text-gray-500">
              {loading ? 'SYNCING' : error ? 'DEGRADED' : 'LIVE'}
            </div>
          </div>
          <select
            value={cityId}
            onChange={(event) => setCityId(event.target.value as CityId)}
            className="border border-cyan-700 bg-gray-950 px-3 py-2 text-sm text-cyan-100"
          >
            {CITY_LIST.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}, {item.state}
              </option>
            ))}
          </select>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <section className="relative min-h-0 min-w-0 flex-1">
          <CityMap
            city={city}
            events={mappedEvents}
            selectedId={selected?.id}
            onSelect={setSelected}
            userLocation={userLocation}
            onUserLocation={setUserLocation}
          />

          <div className="pointer-events-none absolute left-4 top-4 z-20 max-w-sm">
            <div className="pointer-events-auto border border-cyan-700/70 bg-black/75 p-3 text-xs backdrop-blur">
              <p className="electric-blue-text text-sm">{city.name.toUpperCase()} GRID</p>
              <p className="mt-1 text-gray-400">
                {city.stateName} · {mappedEvents.length} mapped nodes · {visibleEvents.length} total
                events
              </p>
              {feed?.weather && (
                <p className="mt-2 text-[var(--neon-green)]">
                  {feed.weather.temperatureF != null ? `${feed.weather.temperatureF}°F` : 'WX'}{' '}
                  {feed.weather.text ?? ''}
                </p>
              )}
              <div className="mt-2 flex gap-3 text-[10px] uppercase tracking-widest text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-6 bg-[#39ff14]" /> Live video
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-2 rounded-full bg-[#00e5ff]" /> Stills
                </span>
              </div>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-20">
            <div className="pointer-events-auto flex flex-wrap gap-2 border border-cyan-900/60 bg-black/70 p-2 text-[10px] uppercase tracking-wider backdrop-blur">
              {ALL_CATEGORIES.map((category) => {
                const meta = CATEGORY_META[category];
                const active = !hidden.has(category);
                const count = feed?.events.filter((event) => event.category === category).length ?? 0;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className={`border px-2 py-1 ${active ? 'opacity-100' : 'opacity-35'}`}
                    style={{ borderColor: meta.color, color: meta.color }}
                  >
                    {meta.label} {count}
                  </button>
                );
              })}
            </div>
          </div>

          {selected && selected.category !== 'camera' && (
            <div className="absolute left-4 top-28 z-20 w-[min(24rem,calc(100%-2rem))] border border-cyan-600 bg-black/95 p-3 text-xs">
              <p className="text-[10px] uppercase tracking-widest" style={{ color: CATEGORY_META[selected.category].color }}>
                {CATEGORY_META[selected.category].label}
              </p>
              <h2 className="mt-1 text-sm text-white">{selected.title}</h2>
              <p className="mt-2 text-gray-300">{selected.description}</p>
              <p className="mt-2 text-gray-500">
                {selected.source} · {formatClock(selected.timestamp)}
              </p>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="mt-3 border border-cyan-700 px-2 py-1 text-[10px] uppercase tracking-widest text-cyan-300"
              >
                Close
              </button>
            </div>
          )}
        </section>

        <aside className="flex h-full min-h-0 w-[22rem] shrink-0 flex-col border-l border-cyan-900/60 bg-black/95 sm:w-[28rem]">
          <div className="flex min-h-0 flex-[2.2] flex-col border-b border-cyan-900/60 p-3">
            <div className="mb-2 flex shrink-0 items-center justify-between text-[10px] uppercase tracking-widest text-cyan-300">
              <span>CCTV Bank · {cameras.filter((camera) => isLiveVideo(camera)).length} video</span>
              <span>{loading ? 'SYNC' : 'ONLINE'}</span>
            </div>
            <CameraWall
              cameras={wallCameras}
              active={activeCamera}
              tick={cameraTick}
              onSelect={setSelected}
            />
          </div>

          <div className="max-h-28 shrink-0 overflow-y-auto border-b border-cyan-900/60 p-3">
            <h3 className="mb-2 text-xs uppercase tracking-widest text-cyan-400">Data Feeds</h3>
            <div className="space-y-1 text-xs">
              {(feed?.feeds ?? []).map((item) => (
                <div key={item.id}>
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">{item.label}</span>
                    <span className={STATUS_CLASS[item.status]}>
                      {item.status.toUpperCase()} {item.count ? `· ${item.count}` : ''}
                    </span>
                  </div>
                  {item.detail && <p className="truncate text-[10px] text-gray-600">{item.detail}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <h3 className="mb-2 text-xs uppercase tracking-widest text-cyan-400">Live Log</h3>
            {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
            <div className="space-y-2">
              {logEvents.slice(0, 80).map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => setSelected(event)}
                  className="block w-full border border-gray-800 bg-gray-950/70 p-2 text-left hover:border-cyan-600"
                >
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider">
                    <span style={{ color: CATEGORY_META[event.category].color }}>
                      {CATEGORY_META[event.category].label}
                    </span>
                    <span className="text-gray-500">{formatClock(event.timestamp)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-200">{event.title}</p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-gray-500">{event.description}</p>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

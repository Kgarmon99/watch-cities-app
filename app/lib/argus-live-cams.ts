import { filterPlayableLiveCameras } from './live-camera-health';
import type { CityConfig, CityEvent, CityId, FeedHealth } from './types';

const ARGUS_BASE =
  'https://raw.githubusercontent.com/GoSlowPoke168/Argus/master/public';
const ARGUS_CACHE_MS = 30 * 60 * 1000;
const ARGUS_WINDOW_SIZE = 420;
const ARGUS_DISPLAY_LIMIT = 320;

const ARGUS_CITY_MATCH: Partial<Record<CityId, { city: string; country: string; aliases?: string[] }>> = {
  istanbul: { city: 'Istanbul', country: 'TR' },
  yogyakarta: { city: 'Yogyakarta', country: 'ID' },
  busan: { city: 'Busan', country: 'KR' },
  'des-moines': { city: 'Des Moines', country: 'US' },
  indianapolis: { city: 'in Indianapolis', country: 'US', aliases: ['Indianapolis'] },
  'hampton-roads': { city: 'Hampton Roads', country: 'US' },
  baltimore: { city: 'Baltimore', country: 'US' },
  memphis: { city: 'Memphis', country: 'US' },
  denver: { city: 'Denver', country: 'US' },
  minneapolis: { city: 'in Minneapolis', country: 'US', aliases: ['Minneapolis'] },
  'washington-dc': { city: 'Wash. DC', country: 'US', aliases: ['Washington DC'] },
};

interface ArgusCore {
  count: number;
  generated: string;
  chunk: number;
  srcDict: string[];
  ccDict: string[];
  ftDict: string[];
  lon: number[];
  lat: number[];
  live: Array<0 | 1 | boolean>;
  src: number[];
  cc: number[];
  ft: number[];
}

interface ArgusLabels {
  cityDict: string[];
  name: string[];
  city: number[];
}

interface ArgusDetail {
  from: number;
  id: string[];
  feed: string[];
  stream: string[];
  route: string[];
}

let coreCache: { at: number; core: ArgusCore; labels: ArgusLabels } | null = null;
const detailCache = new Map<number, { at: number; detail: ArgusDetail }>();

function argusFeed(status: FeedHealth['status'], count: number, detail: string): FeedHealth {
  return {
    id: 'cameras',
    label: 'Argus global live cameras',
    status,
    count,
    detail,
  };
}

async function fetchArgusJson<T>(path: string): Promise<T> {
  const response = await fetch(`${ARGUS_BASE}/${path}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'KGCityView/1.0 public camera index',
    },
  });
  if (!response.ok) {
    throw new Error(`Argus ${path} ${response.status}`);
  }
  return (await response.json()) as T;
}

async function getArgusCore(): Promise<{ core: ArgusCore; labels: ArgusLabels }> {
  if (coreCache && Date.now() - coreCache.at < ARGUS_CACHE_MS) {
    return coreCache;
  }
  const [core, labels] = await Promise.all([
    fetchArgusJson<ArgusCore>('cameras.core.json'),
    fetchArgusJson<ArgusLabels>('cameras.labels.json'),
  ]);
  coreCache = { at: Date.now(), core, labels };
  return coreCache;
}

async function getArgusDetail(chunk: number): Promise<ArgusDetail> {
  const cached = detailCache.get(chunk);
  if (cached && Date.now() - cached.at < ARGUS_CACHE_MS) {
    return cached.detail;
  }
  const detail = await fetchArgusJson<ArgusDetail>(`cameras.detail/${chunk}.json`);
  detailCache.set(chunk, { at: Date.now(), detail });
  return detail;
}

function isInCity(city: CityConfig, lon: number, lat: number): boolean {
  return lon >= city.bbox.west && lon <= city.bbox.east && lat >= city.bbox.south && lat <= city.bbox.north;
}

function selectWorldIndexes(core: ArgusCore, labels: ArgusLabels): number[] {
  const priority = Object.values(ARGUS_CITY_MATCH);
  const indexes: number[] = [];
  for (const match of priority) {
    const names = new Set([match.city, ...(match.aliases ?? [])].map((item) => item.toLowerCase()));
    for (let index = 0; index < core.count && indexes.length < ARGUS_WINDOW_SIZE; index += 1) {
      if (!core.live[index]) continue;
      if (core.ccDict[core.cc[index]] !== match.country) continue;
      if (!names.has((labels.cityDict[labels.city[index]] ?? '').toLowerCase())) continue;
      indexes.push(index);
    }
    if (indexes.length >= ARGUS_WINDOW_SIZE) return indexes;
  }

  const liveIndexes: number[] = [];
  for (let index = 0; index < core.count; index += 1) {
    if (core.live[index] && !indexes.includes(index)) liveIndexes.push(index);
  }
  const step = liveIndexes.length / ARGUS_WINDOW_SIZE;
  indexes.push(...Array.from({ length: Math.min(ARGUS_WINDOW_SIZE - indexes.length, liveIndexes.length) }, (_, slot) => {
    return liveIndexes[Math.floor(slot * step)];
  }));
  return indexes;
}

function selectCityIndexes(city: CityConfig, core: ArgusCore, labels: ArgusLabels): number[] {
  const match = ARGUS_CITY_MATCH[city.id];
  if (!match) return [];
  const names = new Set([match.city, ...(match.aliases ?? [])].map((item) => item.toLowerCase()));
  const indexes: number[] = [];
  for (let index = 0; index < core.count; index += 1) {
    if (!core.live[index]) continue;
    if (core.ccDict[core.cc[index]] !== match.country) continue;
    if (!names.has((labels.cityDict[labels.city[index]] ?? '').toLowerCase())) continue;
    if (!isInCity(city, core.lon[index], core.lat[index])) continue;
    indexes.push(index);
    if (indexes.length >= ARGUS_WINDOW_SIZE) break;
  }
  return indexes;
}

async function buildEvents(indexes: number[], city: CityConfig, core: ArgusCore, labels: ArgusLabels): Promise<CityEvent[]> {
  const chunks = [...new Set(indexes.map((index) => Math.floor(index / core.chunk)))];
  const details = new Map<number, ArgusDetail>(
    await Promise.all(chunks.map(async (chunk) => [chunk, await getArgusDetail(chunk)] as const)),
  );

  return indexes
    .map((index): CityEvent | null => {
      const chunk = Math.floor(index / core.chunk);
      const offset = index - chunk * core.chunk;
      const detail = details.get(chunk);
      const streamUrl = detail?.stream[offset] || detail?.feed[offset];
      if (!streamUrl || !streamUrl.includes('.m3u8')) return null;
      const name = labels.name[index] || 'Public live camera';
      const argusCity = labels.cityDict[labels.city[index]];
      const country = core.ccDict[core.cc[index]];
      const source = core.srcDict[core.src[index]]?.replace(/^opencctv_/, 'OpenCCTV ');
      return {
        id: `argus-${detail?.id[offset] ?? index}`,
        category: 'camera',
        severity: 'info',
        title: name,
        description:
          city.id === 'world-live'
            ? `${argusCity || country || 'Global'} · Argus public live-video index`
            : `${city.name} public live-video stream from the Argus index`,
        latitude: core.lat[index],
        longitude: core.lon[index],
        timestamp: null,
        source: source || 'Argus public camera index',
        streamUrl,
        cameraStatus: 'online',
      };
    })
    .filter((event): event is CityEvent => event != null);
}

export function isArgusCity(city: CityConfig): boolean {
  return city.id === 'world-live' || city.id in ARGUS_CITY_MATCH;
}

export async function fetchArgusLiveCameras(
  city: CityConfig,
): Promise<{ events: CityEvent[]; health: FeedHealth; catalogTotal: number; catalogLabel: string }> {
  const { core, labels } = await getArgusCore();
  const catalogTotal = core.live.filter(Boolean).length;
  const indexes = city.id === 'world-live' ? selectWorldIndexes(core, labels) : selectCityIndexes(city, core, labels);
  const candidates = await buildEvents(indexes, city, core, labels);
  const playable = (await filterPlayableLiveCameras(candidates, 80)).slice(0, ARGUS_DISPLAY_LIMIT);
  const label = city.id === 'world-live' ? 'Argus global live-video index' : `${city.name} Argus live-video index`;
  return {
    events: playable,
    health: argusFeed(
      playable.length ? 'online' : 'empty',
      playable.length,
      `${catalogTotal.toLocaleString()} indexed live-video streams · ${playable.length} playable in this view · ${candidates.length - playable.length} hidden after checks`,
    ),
    catalogTotal,
    catalogLabel: label,
  };
}

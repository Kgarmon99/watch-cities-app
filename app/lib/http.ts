const DEFAULT_HEADERS = {
  Accept: 'application/json, application/geo+json',
  'User-Agent': 'WatchCities/1.0 (local city operations dashboard)',
};

export async function fetchJson<T>(
  url: string,
  options: { timeoutMs?: number; headers?: HeadersInit } = {},
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { ...DEFAULT_HEADERS, ...options.headers },
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function inBbox(
  lon: number | undefined,
  lat: number | undefined,
  bbox: { west: number; south: number; east: number; north: number },
): boolean {
  if (lon == null || lat == null || Number.isNaN(lon) || Number.isNaN(lat)) return false;
  return lon >= bbox.west && lon <= bbox.east && lat >= bbox.south && lat <= bbox.north;
}

export function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

export function asString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

export function asEpoch(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value > 1e12 ? value : value * 1000;
  }
  if (typeof value === 'string' && value) {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function jitterFromId(id: string, magnitude = 0.002): { lng: number; lat: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  const lng = ((hash % 1000) / 1000 - 0.5) * magnitude;
  const lat = (((hash / 1000) % 1000) / 1000 - 0.5) * magnitude;
  return { lng, lat };
}

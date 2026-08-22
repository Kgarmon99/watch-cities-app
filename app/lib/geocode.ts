import { asNumber } from './http';

const cache = new Map<string, { lng: number; lat: number } | null>();

interface CensusResponse {
  result?: {
    addressMatches?: Array<{
      coordinates?: { x?: number; y?: number };
    }>;
  };
}

export async function geocodeAddress(address: string): Promise<{ lng: number; lat: number } | null> {
  const key = address.toLowerCase().replace(/\s+/g, ' ').trim();
  if (!key) return null;
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(key)}&benchmark=Public_AR_Current&format=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      cache: 'force-cache',
    });
    clearTimeout(timeout);
    if (!response.ok) {
      cache.set(key, null);
      return null;
    }
    const data = (await response.json()) as CensusResponse;
    const match = data.result?.addressMatches?.[0]?.coordinates;
    const lng = asNumber(match?.x);
    const lat = asNumber(match?.y);
    const coords = lng != null && lat != null ? { lng, lat } : null;
    cache.set(key, coords);
    return coords;
  } catch {
    cache.set(key, null);
    return null;
  }
}

export async function geocodeMany(
  addresses: string[],
  limit = 20,
): Promise<Map<string, { lng: number; lat: number }>> {
  const unique = [...new Set(addresses.filter(Boolean))].slice(0, limit);
  const resolved = await Promise.all(unique.map(async (address) => [address, await geocodeAddress(address)] as const));
  const map = new Map<string, { lng: number; lat: number }>();
  for (const [address, coords] of resolved) {
    if (coords) map.set(address, coords);
  }
  return map;
}

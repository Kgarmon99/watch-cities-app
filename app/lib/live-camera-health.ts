import type { CityEvent } from './types';

const CHECK_CACHE_MS = 5 * 60 * 1000;
const checkCache = new Map<string, { at: number; playable: boolean }>();

async function fetchWithTimeout(url: string, timeoutMs = 7000): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        Accept: '*/*',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function checkExternalHls(url: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, 2000);
    if (!response.ok) return false;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('mpegurl')) return true;
    const text = await response.text();
    return text.includes('#EXTM3U');
  } catch {
    return false;
  }
}

async function checkEmbed(url: string): Promise<boolean> {
  try {
    const response = await fetchWithTimeout(url, 5000);
    return response.ok || response.status === 403;
  } catch {
    return false;
  }
}

export async function isPlayableLiveCamera(event: CityEvent): Promise<boolean> {
  const url = event.streamUrl ?? event.embedUrl;
  if (!url) return false;

  const cached = checkCache.get(url);
  if (cached && Date.now() - cached.at < CHECK_CACHE_MS) {
    return cached.playable;
  }

  let playable = true;
  if (event.streamUrl) {
    playable = event.streamUrl.startsWith('/api/live-hls')
      ? true
      : await checkExternalHls(event.streamUrl);
  } else if (event.embedUrl) {
    playable = await checkEmbed(event.embedUrl);
  }

  checkCache.set(url, { at: Date.now(), playable });
  return playable;
}

export async function filterPlayableLiveCameras(
  events: CityEvent[],
  concurrency = 12,
): Promise<CityEvent[]> {
  const playable: CityEvent[] = [];
  let next = 0;

  async function worker() {
    while (next < events.length) {
      const event = events[next];
      next += 1;
      if (await isPlayableLiveCamera(event)) {
        playable.push(event);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, events.length) }, () => worker()),
  );

  const order = new Map(events.map((event, index) => [event.id, index]));
  return playable.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

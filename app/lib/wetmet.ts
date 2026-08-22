const WETMET_HEADERS = {
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
};

export interface WetmetStream {
  hls?: string;
  thumb?: string;
}

const cache = new Map<string, { at: number; stream: WetmetStream }>();
const CACHE_MS = 3 * 60 * 1000;

export function wetmetEmbedUrl(uid: string): string {
  return `https://api.wetmet.net/widgets/stream/frame.php?uid=${uid}`;
}

export async function resolveWetmet(uid: string): Promise<WetmetStream> {
  const cached = cache.get(uid);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.stream;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(wetmetEmbedUrl(uid), {
      signal: controller.signal,
      headers: WETMET_HEADERS,
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const html = await response.text();
    const hls = html.match(/https?:\/\/[^"'\s<>]+playlist\.m3u8[^"'\s<>]*/)?.[0];
    const thumb = html.match(/https:\/\/s3\.amazonaws\.com\/wvclientassets\/widget\/[^"'\s<>]+\.(?:png|jpg)/)?.[0];
    const stream: WetmetStream = {
      hls: hls?.replaceAll('&amp;', '&'),
      thumb,
    };
    cache.set(uid, { at: Date.now(), stream });
    return stream;
  } catch {
    const fallback: WetmetStream = {};
    cache.set(uid, { at: Date.now(), stream: fallback });
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}

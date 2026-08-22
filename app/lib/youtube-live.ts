const YT_HEADERS = {
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
};

export interface YouTubeLiveInfo {
  videoId: string;
  title?: string;
  isLive: boolean;
  embeddable: boolean;
}

const inspectCache = new Map<string, { at: number; info: YouTubeLiveInfo | null }>();
const CACHE_MS = 5 * 60 * 1000;

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0`;
}

export function youtubeThumbUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeVideoIdFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(/(?:embed\/|watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return match?.[1];
}

function decodeYtText(value: string): string {
  return value
    .replaceAll('\\u0026', '&')
    .replaceAll('\\/', '/')
    .replaceAll('\\"', '"')
    .replaceAll('\\\\', '\\');
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: YT_HEADERS,
      cache: 'no-store',
      redirect: 'follow',
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function parseWatchPage(html: string, fallbackId?: string): YouTubeLiveInfo | null {
  const details = html.match(/"videoDetails":\{"videoId":"([A-Za-z0-9_-]{11})","title":"([^"]+)"/);
  const canonical = html.match(/rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([A-Za-z0-9_-]{11})"/);
  const videoId = details?.[1] ?? canonical?.[1] ?? fallbackId;
  if (!videoId) return null;
  return {
    videoId,
    title: details?.[2] ? decodeYtText(details[2]) : undefined,
    isLive: html.includes('"isLiveNow":true') || html.includes('"isLive":true'),
    embeddable: !html.includes('"playableInEmbed":false'),
  };
}

export async function inspectYouTubeVideo(videoId: string): Promise<YouTubeLiveInfo | null> {
  const cached = inspectCache.get(videoId);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.info;
  }
  try {
    const html = await fetchHtml(`https://www.youtube.com/watch?v=${videoId}`);
    const info = parseWatchPage(html, videoId);
    inspectCache.set(videoId, { at: Date.now(), info });
    return info;
  } catch {
    inspectCache.set(videoId, { at: Date.now(), info: null });
    return null;
  }
}

export async function resolveYouTubeLiveHandle(handle: string): Promise<YouTubeLiveInfo | null> {
  const key = `handle:${handle}`;
  const cached = inspectCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return cached.info;
  }
  const clean = handle.startsWith('@') ? handle : `@${handle}`;
  try {
    const html = await fetchHtml(`https://www.youtube.com/${clean}/live`);
    const info = parseWatchPage(html);
    inspectCache.set(key, { at: Date.now(), info });
    return info;
  } catch {
    inspectCache.set(key, { at: Date.now(), info: null });
    return null;
  }
}

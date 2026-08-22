const EARTHCAM_PAGES = new Set(['https://www.earthcam.com/usa/kentucky/louisville/']);
const EARTHCAM_HOST_RE = /^videos-\d+\.earthcam\.com$/;

const HLS_HEADERS = {
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
};

function isAllowedPage(value: string | null): value is string {
  return Boolean(value && EARTHCAM_PAGES.has(value));
}

function parseEarthCamStream(html: string): string | undefined {
  const match = html.match(/"stream":"([^"]+playlist\.m3u8[^"]*)"/);
  return match?.[1]?.replaceAll('\\/', '/').replaceAll('&amp;', '&');
}

function isAllowedStreamUrl(value: string | null): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && EARTHCAM_HOST_RE.test(url.hostname);
  } catch {
    return false;
  }
}

function proxiedLine(line: string, targetUrl: string, referer: string): string {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return line;
  const absolute = new URL(trimmed, targetUrl).toString();
  return `/api/live-hls?url=${encodeURIComponent(absolute)}&referer=${encodeURIComponent(referer)}`;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const source = params.get('source');
  const url = params.get('url');
  const referer = params.get('referer');

  let targetUrl: string | undefined;
  let requestReferer: string | undefined;

  if (isAllowedPage(source)) {
    const page = await fetch(source, {
      headers: HLS_HEADERS,
      cache: 'no-store',
    });
    if (!page.ok) {
      return new Response('Live source unavailable', { status: 502 });
    }
    targetUrl = parseEarthCamStream(await page.text());
    requestReferer = source;
  } else if (isAllowedStreamUrl(url) && isAllowedPage(referer)) {
    targetUrl = url;
    requestReferer = referer;
  }

  if (!targetUrl || !requestReferer || !isAllowedStreamUrl(targetUrl)) {
    return new Response('Invalid live stream request', { status: 400 });
  }

  const response = await fetch(targetUrl, {
    headers: {
      ...HLS_HEADERS,
      Referer: requestReferer,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return new Response('Live stream unavailable', { status: response.status });
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('mpegurl') || targetUrl.includes('.m3u8')) {
    const playlist = await response.text();
    const rewritten = playlist
      .split('\n')
      .map((line) => proxiedLine(line, targetUrl, requestReferer))
      .join('\n');
    return new Response(rewritten, {
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'application/vnd.apple.mpegurl',
      },
    });
  }

  return new Response(response.body, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': contentType || 'video/mp2t',
    },
  });
}

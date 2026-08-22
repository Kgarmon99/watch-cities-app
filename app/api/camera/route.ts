import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const ALLOWED_HOSTS = new Set([
  'www.trimarc.org',
  'trimarc.org',
  'pws.trafficwise.org',
  'www.trafficwise.org',
  'goky.ky.gov',
  'www.goky.ky.gov',
  'tnsnapshots.com',
  'www.tnsnapshots.com',
  'smartway.tn.gov',
  'www.smartway.tn.gov',
  'ww2.tdot.state.tn.us',
  'webpubcontent.gray.tv',
  'webapps.wku.edu',
]);

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url');
  if (!raw) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(target.protocol) || !ALLOWED_HOSTS.has(target.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 });
  }

  const upstream = await fetch(target.toString(), {
    cache: 'no-store',
    headers: {
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'User-Agent': 'Mozilla/5.0 WatchCities/1.0 camera proxy',
      Referer: `${target.protocol}//${target.host}/`,
    },
  });
  if (!upstream.ok) {
    return NextResponse.json({ error: 'Camera snapshot unavailable' }, { status: 502 });
  }

  const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: 'Camera snapshot was not an image' }, { status: 502 });
  }

  const body = Buffer.from(await upstream.arrayBuffer());
  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
    },
  });
}

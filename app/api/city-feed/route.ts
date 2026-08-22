import { NextRequest, NextResponse } from 'next/server';
import { getCity } from '@/app/lib/cities';
import { buildCityFeed } from '@/app/lib/live-feed';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const city = getCity(request.nextUrl.searchParams.get('city'));
  try {
    const feed = await buildCityFeed(city);
    return NextResponse.json(feed, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to assemble city feed',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}

const EARTHCAM_PAGES = new Set([
  'https://www.earthcam.com/usa/kentucky/louisville/',
  'https://www.earthcam.com/usa/tennessee/nashville/',
  'https://www.earthcam.com/usa/newyork/brooklynbridge/',
  'https://www.earthcam.com/usa/pennsylvania/philadelphia/',
]);

export function earthCamProxyUrl(pageUrl: string): string | undefined {
  if (!EARTHCAM_PAGES.has(pageUrl)) return undefined;
  return `/api/live-hls?source=${encodeURIComponent(pageUrl)}`;
}

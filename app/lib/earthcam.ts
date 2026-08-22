const EARTHCAM_PAGES = new Set(['https://www.earthcam.com/usa/kentucky/louisville/']);

export function earthCamProxyUrl(pageUrl: string): string | undefined {
  if (!EARTHCAM_PAGES.has(pageUrl)) return undefined;
  return `/api/live-hls?source=${encodeURIComponent(pageUrl)}`;
}

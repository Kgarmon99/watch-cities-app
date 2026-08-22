import type { EventCategory } from '@/app/lib/types';

export const CATEGORY_META: Record<
  EventCategory,
  { label: string; color: string; short: string }
> = {
  police: { label: 'Police', color: '#ff073a', short: 'PD' },
  fire: { label: 'Fire / EMS', color: '#ff6b00', short: 'FD' },
  traffic: { label: 'Traffic', color: '#ffa500', short: 'TR' },
  weather: { label: 'Weather', color: '#39ff14', short: 'WX' },
  camera: { label: 'Cameras', color: '#00e5ff', short: 'CAM' },
  aircraft: { label: 'Aircraft', color: '#bf00ff', short: 'AIR' },
  civic: { label: '311', color: '#3b82f6', short: '311' },
  crime: { label: 'Crime', color: '#ff4d6d', short: 'CR' },
  water: { label: 'River', color: '#22d3ee', short: 'H2O' },
};

export function cameraSrc(url?: string, tick = 0): string | undefined {
  if (!url) return undefined;
  if (url.startsWith('/')) return url;
  try {
    const host = new URL(url).hostname;
    if (
      host === 'i.ytimg.com' ||
      host.endsWith('.ytimg.com') ||
      host === 's3.amazonaws.com' ||
      host.endsWith('.amazonaws.com')
    ) {
      return url;
    }
  } catch {
    return undefined;
  }
  return `/api/camera?url=${encodeURIComponent(url)}&t=${tick}`;
}

export function isLiveVideo(event: { streamUrl?: string; embedUrl?: string }): boolean {
  return Boolean(event.streamUrl || event.embedUrl);
}

export function formatClock(value: number | null | undefined): string {
  if (!value) return '--:--:--';
  return new Date(value).toLocaleTimeString([], { hour12: false });
}

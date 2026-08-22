export type CityId = 'louisville' | 'nashville' | 'bowling-green';

export type EventCategory =
  | 'police'
  | 'fire'
  | 'traffic'
  | 'weather'
  | 'camera'
  | 'aircraft'
  | 'civic'
  | 'crime'
  | 'water';

export type EventSeverity = 'info' | 'watch' | 'alert';

export type FeedStatus = 'online' | 'empty' | 'offline' | 'unavailable';

export interface CityConfig {
  id: CityId;
  name: string;
  state: 'KY' | 'TN';
  stateName: string;
  longitude: number;
  latitude: number;
  zoom: number;
  bbox: {
    west: number;
    south: number;
    east: number;
    north: number;
  };
}

export interface CityEvent {
  id: string;
  category: EventCategory;
  severity: EventSeverity;
  title: string;
  description: string;
  latitude?: number;
  longitude?: number;
  timestamp: number | null;
  source: string;
  mediaUrl?: string;
  streamUrl?: string;
  embedUrl?: string;
  cameraStatus?: 'online' | 'offline' | 'unknown';
}

export interface FeedHealth {
  id: string;
  label: string;
  status: FeedStatus;
  count: number;
  detail?: string;
}

export interface CityFeedResponse {
  city: CityId;
  generatedAt: number;
  weather?: {
    station: string;
    temperatureF?: number;
    windMph?: number;
    text?: string;
    humidity?: number;
  };
  events: CityEvent[];
  feeds: FeedHealth[];
}

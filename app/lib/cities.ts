import type { CityConfig, CityId } from './types';

export const CITIES: Record<CityId, CityConfig> = {
  louisville: {
    id: 'louisville',
    name: 'Louisville',
    state: 'KY',
    stateName: 'Kentucky',
    longitude: -85.7585,
    latitude: 38.2527,
    zoom: 11,
    bbox: { west: -85.95, south: 38.05, east: -85.4, north: 38.42 },
  },
  nashville: {
    id: 'nashville',
    name: 'Nashville',
    state: 'TN',
    stateName: 'Tennessee',
    longitude: -86.7816,
    latitude: 36.1627,
    zoom: 11,
    bbox: { west: -87.05, south: 35.97, east: -86.5, north: 36.41 },
  },
  'bowling-green': {
    id: 'bowling-green',
    name: 'Bowling Green',
    state: 'KY',
    stateName: 'Kentucky',
    longitude: -86.4436,
    latitude: 36.9685,
    zoom: 12,
    bbox: { west: -86.62, south: 36.88, east: -86.32, north: 37.08 },
  },
};

export const CITY_LIST = Object.values(CITIES);

export function getCity(id: string | null | undefined): CityConfig {
  if (id && id in CITIES) {
    return CITIES[id as CityId];
  }
  return CITIES.louisville;
}

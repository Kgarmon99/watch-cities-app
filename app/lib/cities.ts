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
  'san-francisco': {
    id: 'san-francisco',
    name: 'San Francisco',
    state: 'CA',
    stateName: 'California',
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 11,
    bbox: { west: -122.55, south: 37.65, east: -122.2, north: 37.9 },
  },
  'new-york': {
    id: 'new-york',
    name: 'New York',
    state: 'NY',
    stateName: 'New York',
    longitude: -73.9851,
    latitude: 40.7589,
    zoom: 10,
    bbox: { west: -74.05, south: 40.55, east: -73.7, north: 40.92 },
  },
  miami: {
    id: 'miami',
    name: 'Miami',
    state: 'FL',
    stateName: 'Florida',
    longitude: -80.1918,
    latitude: 25.7617,
    zoom: 11,
    bbox: { west: -80.38, south: 25.65, east: -80.12, north: 25.95 },
  },
  philadelphia: {
    id: 'philadelphia',
    name: 'Philadelphia',
    state: 'PA',
    stateName: 'Pennsylvania',
    longitude: -75.1652,
    latitude: 39.9526,
    zoom: 11,
    bbox: { west: -75.3, south: 39.85, east: -74.95, north: 40.15 },
  },
  'los-angeles': {
    id: 'los-angeles',
    name: 'Los Angeles',
    state: 'CA',
    stateName: 'California',
    longitude: -118.2437,
    latitude: 34.0522,
    zoom: 10,
    bbox: { west: -118.67, south: 33.7, east: -118.1, north: 34.35 },
  },
};

export const CITY_LIST = Object.values(CITIES);

export function getCity(id: string | null | undefined): CityConfig {
  if (id && id in CITIES) {
    return CITIES[id as CityId];
  }
  return CITIES.louisville;
}

// birddog-app/app/utils/mockApi.ts

interface MockExternalData {
  id: string;
  name: string;
  type: 'sensor' | 'event' | 'alert';
  value: number;
  location: {
    longitude: number;
    latitude: number;
  };
  timestamp: number;
}

let currentMockData: MockExternalData[] = [
  {
    id: 'sensor-1',
    name: 'Temperature Sensor Alpha',
    type: 'sensor',
    value: 25.5,
    location: { longitude: -85.76, latitude: 38.26 },
    timestamp: Date.now() - 5 * 60 * 1000, // 5 minutes ago
  },
  {
    id: 'event-gamma',
    name: 'Unusual Activity Detected',
    type: 'event',
    value: 1, // Binary: 1 for detected
    location: { longitude: -85.73, latitude: 38.22 },
    timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago
  },
  {
    id: 'alert-omega',
    name: 'Critical System Alert',
    type: 'alert',
    value: 100, // Severity score
    location: { longitude: -85.8, latitude: 38.28 },
    timestamp: Date.now() - 1 * 60 * 1000, // 1 minute ago
  },
];

/**
 * Simulates fetching external data points with dynamic changes.
 * @returns A promise that resolves with an array of dynamically updated mock external data.
 */
export const fetchExternalData = async (): Promise<MockExternalData[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Create a copy to modify
      let updatedData = currentMockData.map(data => ({ ...data }));

      // Randomly update sensor values
      updatedData = updatedData.map(data => {
        if (data.type === 'sensor') {
          // Simulate a random fluctuation within +/- 2.5
          const fluctuation = (Math.random() * 5) - 2.5;
          data.value = parseFloat((data.value + fluctuation).toFixed(1));
          data.timestamp = Date.now();
        }
        return data;
      });

      // Occasionally add a new event or alert
      if (Math.random() < 0.2) { // 20% chance to add a new event/alert
        const newId = `dynamic-event-${Date.now()}`;
        const newType = Math.random() < 0.5 ? 'event' : 'alert';
        const newName = newType === 'event' ? 'New Dynamic Event' : 'URGENT: New Alert!';
        const newLong = -85.75 + (Math.random() * 0.1) - 0.05; // Slightly random longitude
        const newLat = 38.25 + (Math.random() * 0.1) - 0.05;   // Slightly random latitude

        updatedData.push({
          id: newId,
          name: newName,
          type: newType,
          value: newType === 'alert' ? Math.floor(Math.random() * 50) + 50 : 1, // High value for alert
          location: { longitude: newLong, latitude: newLat },
          timestamp: Date.now(),
        });

        // Ensure we don't have too many data points
        if (updatedData.length > 5) {
          updatedData.shift(); // Remove oldest if too many
        }
      }

      currentMockData = updatedData; // Update the global mutable data
      resolve(currentMockData);
    }, 1000); // Simulate network delay
  });
};

/**
 * Simulates fetching a single external data point by ID.
 * @param id The ID of the data point to fetch.
 * @returns A promise that resolves with the mock external data or null if not found.
 */
export const fetchExternalDataById = async (id: string): Promise<MockExternalData | null> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const data = currentMockData.find((d) => d.id === id); // Use currentMockData
      resolve(data || null);
    }, 500); // Simulate network delay
  });
};
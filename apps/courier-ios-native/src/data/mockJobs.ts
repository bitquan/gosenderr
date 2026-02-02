export interface MockJob {
  id: string;
  type: 'package' | 'food';
  title: string;
  payout: number;
  distanceMiles: number;
  pickup: {
    lat: number;
    lng: number;
    label: string;
  };
  dropoff: {
    lat: number;
    lng: number;
    label: string;
  };
}

export const mockJobs: MockJob[] = [
  {
    id: 'job-1001',
    type: 'package',
    title: 'Small parcel • Uptown',
    payout: 18.5,
    distanceMiles: 3.2,
    pickup: {
      lat: 32.7817,
      lng: -96.7995,
      label: 'Oak Lawn Pickup',
    },
    dropoff: {
      lat: 32.7705,
      lng: -96.7985,
      label: 'Victory Park Dropoff',
    },
  },
  {
    id: 'job-1002',
    type: 'food',
    title: 'Lunch order • Arts District',
    payout: 12.25,
    distanceMiles: 2.1,
    pickup: {
      lat: 32.7792,
      lng: -96.8031,
      label: 'Bistro Pickup',
    },
    dropoff: {
      lat: 32.7849,
      lng: -96.7962,
      label: 'Museum Tower',
    },
  },
  {
    id: 'job-1003',
    type: 'package',
    title: 'Grocery bundle • Deep Ellum',
    payout: 24.0,
    distanceMiles: 4.8,
    pickup: {
      lat: 32.7843,
      lng: -96.7842,
      label: 'Deep Ellum Market',
    },
    dropoff: {
      lat: 32.776,
      lng: -96.7735,
      label: 'Fair Park East',
    },
  },
];

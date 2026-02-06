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
    title: 'Small parcel • Herndon',
    payout: 18.5,
    distanceMiles: 3.2,
    pickup: {
      lat: 38.9696,
      lng: -77.3861,
      label: 'Worldgate Centre Pickup',
    },
    dropoff: {
      lat: 38.9699,
      lng: -77.4066,
      label: 'Herndon Town Center Dropoff',
    },
  },
  {
    id: 'job-1002',
    type: 'food',
    title: 'Lunch order • Innovation Ave',
    payout: 12.25,
    distanceMiles: 2.1,
    pickup: {
      lat: 38.9606,
      lng: -77.3859,
      label: 'Innovation Ave Pickup',
    },
    dropoff: {
      lat: 38.9587,
      lng: -77.3982,
      label: 'Elden Street Dropoff',
    },
  },
  {
    id: 'job-1003',
    type: 'package',
    title: 'Grocery bundle • Dranesville',
    payout: 24.0,
    distanceMiles: 4.8,
    pickup: {
      lat: 38.9753,
      lng: -77.4136,
      label: 'Dranesville Market',
    },
    dropoff: {
      lat: 38.9625,
      lng: -77.3736,
      label: 'Herndon Parkway Dropoff',
    },
  },
];

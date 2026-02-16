export type CourierStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type CourierAvailability = 'available' | 'busy' | 'offline';

export type CourierWorkMode = 'package' | 'food';

export type CourierProfile = {
  uid: string;
  status: CourierStatus;
  isOnline: boolean;
  availability: CourierAvailability;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  vehicleType?: string;
  serviceRadiusMiles?: number;
  workModes: CourierWorkMode[];
  lastLocationAt?: string;
  updatedAt: string;
};

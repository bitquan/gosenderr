export const COURIER_PROFILE_SCHEMA_VERSION = 1 as const;

export type CourierAvailability = 'available' | 'busy' | 'offline';

export type CourierOptionalFee = {
  name: string;
  amount: number;
};

export type CourierPackagesRateCard = {
  baseFare: number;
  perMile: number;
  perMinute: number;
  optionalFees: CourierOptionalFee[];
};

export type CourierFoodRateCard = {
  baseFare: number;
  perMile: number;
  restaurantWaitPay: number;
  optionalFees: CourierOptionalFee[];
};

export type CourierRateCards = {
  packages: CourierPackagesRateCard;
  food: CourierFoodRateCard;
};

export type CourierVehicleMetadata = {
  makeModel: string;
  plateNumber: string;
  color: string;
};

export type CourierSettings = {
  acceptsNewJobs: boolean;
  autoStartTracking: boolean;
};

export type CourierPackagesRateCardDraft = {
  baseFare: string;
  perMile: string;
  perMinute: string;
  optionalFees: CourierOptionalFee[];
};

export type CourierFoodRateCardDraft = {
  baseFare: string;
  perMile: string;
  restaurantWaitPay: string;
  optionalFees: CourierOptionalFee[];
};

export type CourierRateCardsDraft = {
  packages: CourierPackagesRateCardDraft;
  food: CourierFoodRateCardDraft;
};

export type CourierProfile = {
  schemaVersion: typeof COURIER_PROFILE_SCHEMA_VERSION;
  uid: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  availability: CourierAvailability;
  vehicle: CourierVehicleMetadata;
  settings: CourierSettings;
  rateCards: CourierRateCards;
  updatedAt: string;
};

export type CourierProfileDraft = {
  fullName: string;
  phoneNumber: string;
  availability: CourierAvailability;
  vehicle: CourierVehicleMetadata;
  settings: CourierSettings;
  rateCards: CourierRateCardsDraft;
};

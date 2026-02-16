export type RateCardFee = {
  label: string;
  amount: number;
};

export type PackageRateCard = {
  kind: 'package';
  baseFare: number;
  perMile: number;
  perMinute: number;
  maxPickupDistanceMiles?: number;
  maxDeliveryDistanceMiles?: number;
  fees?: RateCardFee[];
};

export type PeakHourMultiplier = {
  day: 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
  startHour24: number;
  endHour24: number;
  multiplier: number;
};

export type FoodRateCard = {
  kind: 'food';
  baseFare: number;
  perMile: number;
  restaurantWaitPay: number;
  maxPickupDistanceMiles?: number;
  maxDeliveryDistanceMiles?: number;
  peakHours?: PeakHourMultiplier[];
  fees?: RateCardFee[];
};

export type CourierRateCard = PackageRateCard | FoodRateCard;

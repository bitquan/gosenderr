import { RateCard } from './types';

/**
 * Platform floor rate card - baseline rates for estimate calculations
 * when no nearby couriers are available
 */
export const FLOOR_RATE_CARD: RateCard = {
  baseFee: 5,
  perMile: 1.5,
  minimumFee: 7,
  pickupPerMile: 0.5,
  perMinute: 0,
  maxPickupMiles: 10,
  maxJobMiles: 25,
  maxRadiusMiles: 15,
};

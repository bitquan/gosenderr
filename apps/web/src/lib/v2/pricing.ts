import { GeoPoint, RateCard, TransportMode } from './types';

/**
 * Calculate straight-line distance between two points using Haversine formula
 * Returns distance in miles
 */
export function calcMiles(pickup: GeoPoint, dropoff: GeoPoint): number {
  const R = 3959; // Earth radius in miles
  const lat1 = pickup.lat * Math.PI / 180;
  const lat2 = dropoff.lat * Math.PI / 180;
  const dLat = (dropoff.lat - pickup.lat) * Math.PI / 180;
  const dLng = (dropoff.lng - pickup.lng) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Estimate delivery time in minutes based on distance and transport mode
 */
export function estimateMinutes(miles: number, mode: TransportMode): number {
  const speedMph = {
    walk: 3,
    scooter: 10,
    car: 25,
  }[mode];

  return Math.round((miles / speedMph) * 60);
}

/**
 * Calculate delivery fee based on flexible rate card
 * @param rateCard - Courier's rate card with all pricing rules
 * @param jobMiles - Distance from pickup to dropoff
 * @param pickupMiles - Optional distance from courier to pickup ("deadhead")
 * @param mode - Optional transport mode for time estimation
 */
export function calcFee(
  rateCard: RateCard,
  jobMiles: number,
  pickupMiles?: number,
  mode?: TransportMode
): number {
  let fee = rateCard.baseFee + rateCard.perMile * jobMiles;

  // Add deadhead cost if configured
  if (rateCard.pickupPerMile && pickupMiles !== undefined) {
    fee += rateCard.pickupPerMile * pickupMiles;
  }

  // Add time-based cost if configured
  if (rateCard.perMinute && mode) {
    const minutes = estimateMinutes(jobMiles, mode);
    fee += rateCard.perMinute * minutes;
  }

  // Apply minimum fee if configured
  if (rateCard.minimumFee && fee < rateCard.minimumFee) {
    fee = rateCard.minimumFee;
  }

  return Math.round(fee * 100) / 100; // Round to 2 decimals
}

/**
 * Check if a courier is eligible for a job based on their rate card rules
 * Returns eligibility status and reason if ineligible
 */
export function checkEligibility(
  rateCard: RateCard,
  jobMiles: number,
  pickupMiles: number
): { eligible: boolean; reason?: string } {
  // Check discovery radius (if configured)
  if (rateCard.maxRadiusMiles !== undefined && pickupMiles > rateCard.maxRadiusMiles) {
    return { eligible: false, reason: `Outside service area (${rateCard.maxRadiusMiles}mi max)` };
  }

  // Check pickup distance limit
  if (rateCard.maxPickupMiles !== undefined && pickupMiles > rateCard.maxPickupMiles) {
    return { eligible: false, reason: `Too far to pickup (${rateCard.maxPickupMiles}mi max)` };
  }

  // Check job distance limit
  if (rateCard.maxJobMiles !== undefined && jobMiles > rateCard.maxJobMiles) {
    return { eligible: false, reason: `Trip too long (${rateCard.maxJobMiles}mi max)` };
  }

  return { eligible: true };
}

/**
 * Legacy compatibility - returns boolean only
 */
export function isEligible(
  rateCard: RateCard,
  jobMiles: number,
  pickupMiles: number
): boolean {
  return checkEligibility(rateCard, jobMiles, pickupMiles).eligible;
}

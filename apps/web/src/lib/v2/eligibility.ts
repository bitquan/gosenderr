import { RateCard } from './types';

export interface EligibilityResult {
  eligible: boolean;
  reason?: string;
}

/**
 * Determine if a courier is eligible for a job and why they're not
 * @param rateCard - Courier's rate card with distance rules
 * @param jobMiles - Distance from pickup to dropoff
 * @param pickupMiles - Distance from courier location to pickup
 * @returns Object with eligibility status and optional reason string
 */
export function getEligibilityReason(
  rateCard: RateCard,
  jobMiles: number,
  pickupMiles: number
): EligibilityResult {
  // Check pickup distance limit
  if (rateCard.maxPickupMiles !== undefined && pickupMiles > rateCard.maxPickupMiles) {
    return {
      eligible: false,
      reason: 'Pickup is outside courier radius',
    };
  }

  // Check job distance limit
  if (rateCard.maxJobMiles !== undefined && jobMiles > rateCard.maxJobMiles) {
    return {
      eligible: false,
      reason: 'Trip distance exceeds courier max',
    };
  }

  // All checks passed
  return {
    eligible: true,
  };
}

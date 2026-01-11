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
  // Check discovery radius (maxRadiusMiles)
  if (rateCard.maxRadiusMiles !== undefined && pickupMiles > rateCard.maxRadiusMiles) {
    return {
      eligible: false,
      reason: `Outside service area (${rateCard.maxRadiusMiles}mi max)`,
    };
  }

  // Check pickup distance limit
  if (rateCard.maxPickupMiles !== undefined && pickupMiles > rateCard.maxPickupMiles) {
    return {
      eligible: false,
      reason: `Too far to pickup (${rateCard.maxPickupMiles}mi max)`,
    };
  }

  // Check job distance limit
  if (rateCard.maxJobMiles !== undefined && jobMiles > rateCard.maxJobMiles) {
    return {
      eligible: false,
      reason: `Trip too long (${rateCard.maxJobMiles}mi max)`,
    };
  }

  // All checks passed
  return {
    eligible: true,
  };
}

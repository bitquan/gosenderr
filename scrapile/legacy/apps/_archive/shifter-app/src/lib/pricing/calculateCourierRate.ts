import { PackageRateCard, FoodRateCard } from '@gosenderr/shared';
import { getPeakMultiplier } from './isPeakHour';

export interface JobInfo {
  distance: number; // miles
  estimatedMinutes: number;
  isFoodItem: boolean;
}

export interface RateBreakdown {
  baseFare: number;
  perMileCharge: number;
  timeCharge?: number; // Package only
  peakMultiplier?: number; // Food only
  subtotal: number;
  courierEarnings: number;
  platformFee: number;
  totalCustomerCharge: number;
}

/**
 * Calculate rate for a delivery job using courier's rate card
 */
export function calculateCourierRate(
  rateCard: PackageRateCard | FoodRateCard,
  job: JobInfo,
  now: Date = new Date()
): RateBreakdown {
  const baseFare = rateCard.baseFare;
  const perMileCharge = job.distance * rateCard.perMile;
  let timeCharge = 0;
  let peakMultiplier: number | undefined;
  let subtotal = baseFare + perMileCharge;

  // Package delivery: add time-based charge
  if (!job.isFoodItem && 'perMinute' in rateCard) {
    timeCharge = job.estimatedMinutes * rateCard.perMinute;
    subtotal += timeCharge;
  }

  // Food delivery: apply peak multiplier
  if (job.isFoodItem && 'peakHours' in rateCard) {
    const multiplier = getPeakMultiplier(rateCard.peakHours, now);
    if (multiplier) {
      peakMultiplier = multiplier;
      subtotal *= multiplier;
    }
  }

  const courierEarnings = Math.round(subtotal * 100) / 100;
  const platformFee = job.isFoodItem ? 1.50 : 2.50;
  const totalCustomerCharge = courierEarnings + platformFee;

  return {
    baseFare,
    perMileCharge,
    timeCharge: timeCharge > 0 ? timeCharge : undefined,
    peakMultiplier,
    subtotal,
    courierEarnings,
    platformFee,
    totalCustomerCharge,
  };
}

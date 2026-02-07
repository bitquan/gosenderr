import { FoodRateCard } from '@gosenderr/shared';

/**
 * Check if current time falls within any peak hour window
 * @param peakHours - Array of peak hour configurations from courier's food rate card
 * @param now - Current date/time (defaults to now)
 * @returns Peak multiplier if in peak hours, null otherwise
 */
export function getPeakMultiplier(
  peakHours: FoodRateCard['peakHours'],
  now: Date = new Date()
): number | null {
  if (!peakHours || peakHours.length === 0) {
    return null;
  }

  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const currentTime = now.toTimeString().substring(0, 5); // "HH:MM"

  for (const peak of peakHours) {
    // Check if current day matches
    const daysLower = peak.days.map(d => d.toLowerCase());
    if (!daysLower.includes(currentDay)) {
      continue;
    }

    // Check if current time is within range
    if (currentTime >= peak.startTime && currentTime <= peak.endTime) {
      return peak.multiplier;
    }
  }

  return null;
}

/**
 * Check if current time is peak hour
 */
export function isPeakHour(
  peakHours: FoodRateCard['peakHours'],
  now: Date = new Date()
): boolean {
  return getPeakMultiplier(peakHours, now) !== null;
}

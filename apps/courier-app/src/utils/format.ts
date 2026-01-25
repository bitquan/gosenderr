/**
 * Format distance in meters to readable string
 * @param meters Distance in meters
 * @returns Formatted string like "0.5 mi" or "500 ft"
 */
export function formatDistance(meters: number): string {
  // Convert meters to feet
  const feet = meters * 3.28084;
  
  // If less than 0.1 miles (528 feet), show in feet
  if (feet < 528) {
    return `${Math.round(feet)} ft`;
  }
  
  // Otherwise show in miles
  const miles = meters / 1609.34;
  return `${miles.toFixed(1)} mi`;
}

/**
 * Format duration in seconds to readable string
 * @param seconds Duration in seconds
 * @returns Formatted string like "5 min" or "1 hr 30 min"
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (hours > 0) {
    return `${hours} hr${hours > 1 ? 's' : ''} ${remainingMinutes} min`;
  }
  
  return `${minutes} min`;
}

/**
 * Format time to 12-hour format
 * @param date Date object
 * @returns Formatted time like "3:45 PM"
 */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Calculate ETA from current time and duration
 * @param durationSeconds Duration in seconds
 * @returns Formatted ETA like "3:45 PM"
 */
export function calculateETA(durationSeconds: number): string {
  const eta = new Date(Date.now() + durationSeconds * 1000);
  return formatTime(eta);
}

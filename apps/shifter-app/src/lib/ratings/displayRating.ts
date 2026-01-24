/**
 * Format a rating for display with stars and count
 * 
 * @param averageRating - The average rating (0-5)
 * @param totalRatings - The total number of ratings
 * @returns Formatted string like "★★★★☆ (4.8 • 127 ratings)"
 */
export function formatRatingDisplay(averageRating: number, totalRatings: number): string {
  if (totalRatings === 0) {
    return 'No ratings yet';
  }

  const stars = getStarDisplay(averageRating);
  const ratingText = averageRating.toFixed(1);
  const countText = totalRatings === 1 ? '1 rating' : `${totalRatings} ratings`;

  return `${stars} (${ratingText} • ${countText})`;
}

/**
 * Get star display for a rating
 * 
 * @param rating - The rating (0-5)
 * @returns String with filled and empty stars like "★★★★☆"
 */
export function getStarDisplay(rating: number): string {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return '★'.repeat(fullStars) + (hasHalfStar ? '⯨' : '') + '☆'.repeat(emptyStars);
}

/**
 * Render stars for a rating (JSX compatible)
 * 
 * @param rating - The rating (0-5)
 * @param size - Size in pixels (default: 16)
 * @param color - Color for filled stars (default: '#fbbf24')
 * @returns Array of star elements
 */
export function renderStars(rating: number, size: number = 16, color: string = '#fbbf24') {
  return [1, 2, 3, 4, 5].map((star) => ({
    filled: star <= Math.round(rating),
    key: star,
    size,
    color,
  }));
}

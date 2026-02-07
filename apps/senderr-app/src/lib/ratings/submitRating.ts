import { addDoc, collection, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import type { RatingRole, RatingCategories } from '@gosenderr/shared';

export interface SubmitRatingParams {
  deliveryJobId: string;
  fromUserId: string;
  toUserId: string;
  role: RatingRole;
  stars: number;
  review?: string;
  categories?: RatingCategories;
}

/**
 * Submit a rating for a delivery job
 * 
 * Validates that:
 * - Stars are between 1-5
 * - User hasn't already rated this delivery
 * - Review is under 500 characters
 * 
 * Creates a rating document in Firestore which triggers a Cloud Function
 * to update the user's average rating.
 */
export async function submitRating(rating: SubmitRatingParams): Promise<void> {
  // Validate stars
  if (rating.stars < 1 || rating.stars > 5) {
    throw new Error('Rating must be between 1 and 5 stars');
  }

  // Validate review length
  if (rating.review && rating.review.length > 500) {
    throw new Error('Review must be 500 characters or less');
  }

  // Validate category ratings if provided
  if (rating.categories) {
    const categoryValues = Object.values(rating.categories);
    for (const value of categoryValues) {
      if (value !== undefined && (value < 1 || value > 5)) {
        throw new Error('Category ratings must be between 1 and 5 stars');
      }
    }
  }

  // Check if user has already rated this delivery
  const existingRatingQuery = query(
    collection(db, 'ratings'),
    where('deliveryJobId', '==', rating.deliveryJobId),
    where('fromUserId', '==', rating.fromUserId)
  );

  const existingRatings = await getDocs(existingRatingQuery);

  if (!existingRatings.empty) {
    throw new Error('You have already rated this delivery');
  }

  // Create the rating document
  await addDoc(collection(db, 'ratings'), {
    deliveryJobId: rating.deliveryJobId,
    fromUserId: rating.fromUserId,
    toUserId: rating.toUserId,
    role: rating.role,
    stars: rating.stars,
    review: rating.review || null,
    categories: rating.categories || null,
    createdAt: Timestamp.now(),
  });
}

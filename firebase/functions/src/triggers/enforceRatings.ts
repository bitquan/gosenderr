import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Enforce ratings and update user statistics
 *
 * Triggered when a new rating is created.
 *
 * Actions:
 * 1. Query all ratings for the rated user
 * 2. Calculate average rating
 * 3. Update user document with averageRating and totalRatings
 * 4. For couriers: Check if they should be suspended for low ratings
 *    - If courier has >= 5 ratings and average < 3.5
 *    - Suspend courier and create dispute document
 */
export const enforceRatings = functions.firestore
  .document("ratings/{ratingId}")
  .onCreate(async (snapshot, context) => {
    const ratingData = snapshot.data();
    const ratingId = context.params.ratingId;

    const {toUserId, role, stars} = ratingData;

    if (!toUserId || !role || !stars) {
      console.error(`Rating ${ratingId}: Missing required fields`);
      return null;
    }

    console.log(
      `Rating ${ratingId}: Processing rating for user ${toUserId} (${role})`
    );

    try {
      // Query all ratings for this user with the same role
      const ratingsSnapshot = await db
        .collection("ratings")
        .where("toUserId", "==", toUserId)
        .where("role", "==", role)
        .get();

      // Calculate average rating
      let totalStars = 0;
      let count = 0;

      ratingsSnapshot.forEach((doc) => {
        const rating = doc.data();
        totalStars += rating.stars;
        count++;
      });

      const averageRating = count > 0 ? totalStars / count : 0;

      console.log(
        `Rating ${ratingId}: Calculated average for ${toUserId}: ${averageRating} (${count} ratings)`
      );

      // Update user document
      await db.collection("users").doc(toUserId).update({
        averageRating,
        totalRatings: count,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Rating ${ratingId}: Updated user ${toUserId} statistics`);

      // Check if courier should be suspended for low ratings
      if (role === "customer_to_courier" && count >= 5 && averageRating < 3.5) {
        console.log(
          `Rating ${ratingId}: Courier ${toUserId} has low rating (${averageRating}), suspending...`
        );

        // Update courier status to suspended
        await db
          .collection("users")
          .doc(toUserId)
          .update({
            "courierProfile.status": "suspended",
            "updatedAt": admin.firestore.FieldValue.serverTimestamp(),
          });

        // Create dispute document
        await db.collection("disputes").add({
          type: "low_rating_suspension",
          courierId: toUserId,
          deliveryJobId: null,
          reportedBy: "system",
          reportedAgainst: toUserId,
          reason: `Courier suspended due to low average rating: ${averageRating.toFixed(
            2
          )} (${count} ratings)`,
          evidence: [],
          status: "open",
          averageRating,
          totalRatings: count,
          adminNotes: null,
          resolution: null,
          resolvedBy: null,
          resolvedAt: null,
          refundIssued: false,
          refundAmount: null,
          userWarned: null,
          userBanned: null,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(
          `Rating ${ratingId}: Created dispute for suspended courier ${toUserId}`
        );
      }

      return {success: true, averageRating, totalRatings: count};
    } catch (error: any) {
      console.error(
        `Rating ${ratingId}: Error processing rating:`,
        error
      );
      return {success: false, error: error.message};
    }
  });

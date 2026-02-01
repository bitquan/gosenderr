#!/usr/bin/env node

// Backfill seller rating stats from marketplace ratings
// Run: node scripts/backfill-seller-ratings.js

const admin = require("./firebase-admin-wrapper");

const db = admin.firestore();
const { FieldValue } = admin.firestore;

async function backfillSellerRatings() {
  const ratingsSnap = await db
    .collection("ratings")
    .where("type", "==", "marketplace")
    .get();

  if (ratingsSnap.empty) {
    console.log("No marketplace ratings found.");
    return;
  }

  const totals = new Map();

  ratingsSnap.forEach((doc) => {
    const data = doc.data();
    const sellerId = data.sellerId;
    const sellerRating = data.sellerRating;

    if (!sellerId || typeof sellerRating !== "number") return;

    if (!totals.has(sellerId)) {
      totals.set(sellerId, {
        sum: 0,
        count: 0,
        latestReview: null,
        latestReviewAt: null,
      });
    }

    const entry = totals.get(sellerId);
    entry.sum += sellerRating;
    entry.count += 1;

    if (data.review && data.createdAt) {
      const createdAt = data.createdAt.toDate ? data.createdAt.toDate() : null;
      if (createdAt) {
        const prev = entry.latestReviewAt ? entry.latestReviewAt.toDate() : null;
        if (!prev || createdAt.getTime() > prev.getTime()) {
          entry.latestReview = data.review;
          entry.latestReviewAt = data.createdAt;
        }
      }
    }
  });

  const sellerIds = Array.from(totals.keys());
  let batch = db.batch();
  let batchCount = 0;
  let updated = 0;

  for (const sellerId of sellerIds) {
    const { sum, count, latestReview, latestReviewAt } = totals.get(sellerId);
    const avg = count > 0 ? sum / count : 0;

    const payload = {
      "sellerProfile.ratingAvg": avg,
      "sellerProfile.ratingCount": count,
      "sellerProfile.updatedAt": FieldValue.serverTimestamp(),
    };

    if (latestReview) {
      payload["sellerProfile.latestReview"] = latestReview;
    }
    if (latestReviewAt) {
      payload["sellerProfile.latestReviewAt"] = latestReviewAt;
    }

    const sellerRef = db.collection("users").doc(sellerId);
    batch.set(sellerRef, payload, { merge: true });
    batchCount += 1;
    updated += 1;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`✅ Updated ${updated} seller profiles.`);
}

backfillSellerRatings().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});

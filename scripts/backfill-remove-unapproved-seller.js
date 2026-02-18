#!/usr/bin/env node

const admin = require("firebase-admin");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const FORCE = args.includes("--force") || args.includes("-f");
const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  "gosenderr-6773f";

if (!process.env.FIRESTORE_EMULATOR_HOST && !FORCE) {
  console.error(
    "ERROR: FIRESTORE_EMULATOR_HOST is not set. This script defaults to emulator-only runs for safety. Use --force for production.",
  );
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

function asRoles(data) {
  if (Array.isArray(data?.roles)) return data.roles.filter((r) => typeof r === "string");
  if (typeof data?.role === "string") return [data.role];
  return [];
}

function hasApprovedSellerState(data) {
  return (
    data?.role === "seller" ||
    data?.sellerApplication?.status === "approved" ||
    data?.sellerProfile?.status === "approved" ||
    data?.sellerProfile?.isActive === true
  );
}

function hasStrongSellerSignals(data) {
  const sellerProfile = data?.sellerProfile || {};
  return Boolean(
    sellerProfile?.businessName ||
      sellerProfile?.stripeAccountId ||
      (typeof sellerProfile?.activeListings === "number" && sellerProfile.activeListings > 0) ||
      (typeof sellerProfile?.ratingCount === "number" && sellerProfile.ratingCount > 0),
  );
}

async function userHasMarketplaceActivity(uid) {
  const listings = await db
    .collection("marketplaceItems")
    .where("sellerId", "==", uid)
    .limit(1)
    .get();

  if (!listings.empty) return true;

  const orders = await db
    .collection("marketplaceOrders")
    .where("sellerId", "==", uid)
    .limit(1)
    .get();

  return !orders.empty;
}

(async function main() {
  console.log("\n=== Backfill: remove accidental seller role ===");
  console.log(`Project: ${PROJECT_ID}`);
  console.log(`Mode: ${APPLY ? "APPLY" : "DRY-RUN"}`);

  const userSnaps = await db.collection("users").get();
  console.log(`Scanned users: ${userSnaps.size}`);

  let sellerCandidates = 0;
  let approvedOrLegitSkipped = 0;
  let activitySkipped = 0;
  let wouldUpdate = 0;
  let updated = 0;

  for (const userDoc of userSnaps.docs) {
    const uid = userDoc.id;
    const data = userDoc.data() || {};
    const roles = asRoles(data);
    const hasSellerRole = roles.includes("seller");

    if (!hasSellerRole) continue;
    sellerCandidates += 1;

    if (hasApprovedSellerState(data) || hasStrongSellerSignals(data)) {
      approvedOrLegitSkipped += 1;
      continue;
    }

    const hasActivity = await userHasMarketplaceActivity(uid);
    if (hasActivity) {
      activitySkipped += 1;
      continue;
    }

    const nextRoles = roles.filter((r) => r !== "seller");
    const nextRole = data?.role === "seller" ? "customer" : data?.role;

    wouldUpdate += 1;
    console.log(`Candidate ${uid}: roles ${JSON.stringify(roles)} -> ${JSON.stringify(nextRoles)}, role ${JSON.stringify(data?.role)} -> ${JSON.stringify(nextRole)}`);

    if (APPLY) {
      await userDoc.ref.set(
        {
          roles: nextRoles,
          role: nextRole,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          sellerRoleBackfill: {
            removedAt: admin.firestore.FieldValue.serverTimestamp(),
            reason: "unapproved_seller_cleanup",
          },
        },
        { merge: true },
      );
      updated += 1;
    }
  }

  console.log("\n=== Summary ===");
  console.log(`Seller-role users found: ${sellerCandidates}`);
  console.log(`Skipped (approved/legit signals): ${approvedOrLegitSkipped}`);
  console.log(`Skipped (has marketplace activity): ${activitySkipped}`);
  console.log(`Would update: ${wouldUpdate}`);
  console.log(`Updated: ${updated}`);

  process.exit(0);
})().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});

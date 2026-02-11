import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import {
  getMissingRequiredFeatureFlagPaths,
  getUnknownFeatureFlagPaths,
  normalizeFeatureFlags,
} from "../packages/shared/src/utils/featureFlags";

type Mode = "ensure" | "verify";

function getMode(args: string[]): Mode {
  if (args.includes("--verify")) return "verify";
  return "ensure";
}

async function main() {
  const mode = getMode(process.argv.slice(2));
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    "gosenderr-6773f";
  const forceAdminWebEnabled = process.env.ENABLE_ADMIN_WEB === "1";

  if (getApps().length === 0) {
    initializeApp({ projectId });
  }

  const db = getFirestore();
  const configRef = db.collection("featureFlags").doc("config");
  const snapshot = await configRef.get();
  const existingData = snapshot.exists ? snapshot.data() : {};
  const normalized = normalizeFeatureFlags(existingData, { forceAdminWebEnabled });

  if (mode === "ensure") {
    await configRef.set(normalized, { merge: true });
  }

  const mergedView = { ...(existingData || {}), ...normalized };
  const missingPaths = getMissingRequiredFeatureFlagPaths(mergedView);
  const unknownPaths = getUnknownFeatureFlagPaths(existingData);

  const actionLabel = mode === "ensure" ? "ensured" : "verified";
  console.log(
    `✅ Feature flags ${actionLabel} (${snapshot.exists ? "existing" : "new"})`,
  );
  console.log(`  admin.webPortalEnabled: ${normalized.admin.webPortalEnabled}`);
  console.log(`  senderrplace.marketplace_v2: ${normalized.senderrplace.marketplace_v2}`);

  if (missingPaths.length > 0) {
    console.warn(`⚠️ Missing required paths: ${missingPaths.join(", ")}`);
    if (mode === "verify") {
      process.exitCode = 1;
    }
  } else {
    console.log("✅ Required feature flag paths are present");
  }

  if (unknownPaths.length > 0) {
    console.warn(`ℹ️ Unknown feature flag paths: ${unknownPaths.join(", ")}`);
  }
}

main().catch((error) => {
  console.error("❌ Failed to ensure feature flags:", error);
  process.exit(1);
});

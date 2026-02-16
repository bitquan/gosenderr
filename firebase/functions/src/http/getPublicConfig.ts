import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

export const getPublicConfig = functions.https.onCall(
  {
    cors: [
      "https://gosenderr.com",
      "https://www.gosenderr.com",
      "https://gosenderr-6773f.web.app",
      "https://gosenderr-marketplace.web.app",
      "https://gosenderr-courier.web.app",
      "https://gosenderr-admin.web.app",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "http://localhost:5174",
      "http://127.0.0.1:5174",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:5176",
      "http://127.0.0.1:5176",
    ],
    minInstances: 1,
  },
  async () => {
  const stripeDoc = await admin.firestore().doc("secrets/stripe").get();
  const stripeData = stripeDoc.exists ? stripeDoc.data() : {};

  const mapboxDoc = await admin.firestore().doc("secrets/mapbox").get();
  const mapboxData = mapboxDoc.exists ? mapboxDoc.data() : {};

  const configuredMode = stripeData?.mode || "test";
  const livePublishableKey = stripeData?.livePublishableKey || "";
  const testPublishableKey = stripeData?.publishableKey || stripeData?.testPublishableKey || "";

  const useLive = configuredMode === "live" && !!livePublishableKey;
  const stripePublishableKey = useLive ? livePublishableKey : testPublishableKey;
  const effectiveMode = useLive ? "live" : "test";
  const firebaseProjectId =
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT ||
    admin.app().options.projectId ||
    "";
  const expectedAuthDomain = firebaseProjectId
    ? `${firebaseProjectId}.firebaseapp.com`
    : "";
  const firestoreRulesSource = process.env.FIRESTORE_RULES_FILE || "firebase/firestore.rules";

    return {
      stripePublishableKey,
      stripeMode: effectiveMode,
      mapboxPublicToken: mapboxData?.publicToken || "",
      firebaseProjectId,
      expectedAuthDomain,
      firestoreRulesSource,
    };
  },
);

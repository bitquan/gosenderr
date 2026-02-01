import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

export const getPublicConfig = functions.https.onCall({ cors: true }, async () => {
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

  return {
    stripePublishableKey,
    stripeMode: effectiveMode,
    mapboxPublicToken: mapboxData?.publicToken || "",
  };
});

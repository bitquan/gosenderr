import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";

export const getPublicConfig = functions.https.onCall({ cors: true }, async () => {
  const doc = await admin.firestore().doc("secrets/stripe").get();
  const data = doc.exists ? doc.data() : {};

  return {
    stripePublishableKey: data?.publishableKey || "",
    stripeMode: data?.mode || "test",
  };
});

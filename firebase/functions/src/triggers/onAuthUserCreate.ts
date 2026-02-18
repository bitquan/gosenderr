import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { grantSignupBonusTokens } from "../utils/signupBonus";

export const onAuthUserCreate = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;

  const usersRef = admin.firestore().doc(`users/${uid}`);
  const userSnap = await usersRef.get();

  if (!userSnap.exists) {
    await usersRef.set(
      {
        email: user.email || null,
        displayName: user.displayName || (user.email ? user.email.split("@")[0] : "Customer"),
        role: "customer",
        roles: ["buyer", "seller"],
        profilePhotoUrl: user.photoURL || "",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        buyerProfile: {
          favoriteItems: [],
          savedSearches: [],
          purchaseHistory: [],
        },
        sellerProfile: null,
        averageRating: 0,
        totalRatings: 0,
      },
      { merge: true },
    );

    functions.logger.info("Created users document from auth trigger", { uid });
  }

  const result = await grantSignupBonusTokens(uid, "onAuthUserCreate");
  functions.logger.info("Processed signup token bonus", {
    uid,
    bonusTokens: result.bonusTokens,
    granted: result.granted,
    txId: result.txId,
  });
  return null;
});

import * as functions from "firebase-functions";
import { grantSignupBonusTokens } from "../utils/signupBonus";

export const onAuthUserCreate = functions.auth.user().onCreate(async (user) => {
  const uid = user.uid;
  const result = await grantSignupBonusTokens(uid, "onAuthUserCreate");
  functions.logger.info("Processed signup token bonus", {
    uid,
    bonusTokens: result.bonusTokens,
    granted: result.granted,
    txId: result.txId,
  });
  return null;
});

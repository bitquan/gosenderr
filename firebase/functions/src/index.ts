import * as admin from "firebase-admin";

admin.initializeApp();

// Export all functions
export { autoCancel } from "./triggers/autoCancel";
export { sendNotifications } from "./triggers/notifications";
export { capturePayment } from "./triggers/capturePayment";
export { refundPayment } from "./triggers/refundPayment";
export { enforceRatings } from "./triggers/enforceRatings";
export { buildRoutes } from "./triggers/buildRoutes";
export { buildLongRoutes } from "./triggers/buildLongRoutes";
export { seedHubs } from "./triggers/seedHubs";
export { buildLongHaulRoutes } from "./triggers/buildLongHaulRoutes";
export { setPackageRunnerClaim } from "./http/setPackageRunnerClaim";

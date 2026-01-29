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
export { onAdminActionLog } from "./triggers/onAdminActionLog";
export { onUserCreate } from "./triggers/onUserCreate";

// HTTP Callable Functions
export { setPackageRunnerClaim } from "./http/setPackageRunnerClaim";
export { setAdminClaim } from "./http/setAdminClaim";
export { banUser } from "./http/banUser";
export { createUserForAdmin } from "./http/createUserForAdmin";
export { diagnoseCreateUserCall } from "./http/diagnoseCreateUserCall";
export { simulateRule } from "./http/simulateRule";
export { runTestFlow } from "./http/runTestFlow";
export { runSystemSimulation } from "./http/runSystemSimulation";

// Stripe Functions
export * from "./stripe";

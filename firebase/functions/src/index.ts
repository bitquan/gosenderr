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
export { runTestFlow } from "./http/runTestFlow";
export { getPublicConfig } from "./http/getPublicConfig";
export { getPublicConfigHttp } from "./http/getPublicConfigHttp";
export { createPaymentIntentHttp } from "./http/createPaymentIntentHttp";
export { sendTestPush } from "./http/sendTestPush";
export { logCommandFailure } from "./http/logCommandFailure";
export { simulateRule } from "./http/simulateRule";
export { runSystemSimulation } from "./http/runSystemSimulation";
export {
	claimCourierJob,
	advanceCourierJobStatus,
	cancelCourierJob,
	declineCourierJobOffer,
	submitCourierJobProof,
} from "./http/courierJobCommands";
export {
	getTokenPolicy,
	getTokenWalletSummary,
	getPayoutTokenWalletSummary,
	tokenReserve,
	tokenCommit,
	tokenRelease,
	tokenRefund,
	tokenCreateCheckoutSession,
	tokenFinalizeCheckoutSession,
	adminGetTokenWalletView,
	adminListTokenLedger,
	adjustTokenWalletBalance,
} from "./http/tokenWalletCommands";

// Stripe Functions
export * from "./stripe";

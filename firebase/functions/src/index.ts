import * as admin from "firebase-admin";

admin.initializeApp();

// Export all functions
export { autoCancel } from "./triggers/autoCancel";
export { sendNotifications } from "./triggers/notifications";
export { capturePayment } from "./triggers/capturePayment";
export { refundPayment } from "./triggers/refundPayment";

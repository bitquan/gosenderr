import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp();
}

export { commandAcceptJob } from "./senderr/commandAcceptJob";
export { commandStartPickup } from "./senderr/commandStartPickup";
export { commandMarkArrivedPickup } from "./senderr/commandMarkArrivedPickup";
export { commandConfirmPickup } from "./senderr/commandConfirmPickup";
export { commandStartDropoff } from "./senderr/commandStartDropoff";
export { commandCompleteDelivery } from "./senderr/commandCompleteDelivery";
export { uploadCourierAsset } from "./senderr/uploadCourierAsset";

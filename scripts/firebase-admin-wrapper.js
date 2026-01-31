// Wrapper to load firebase-admin from functions directory
const path = require("path");
const admin = require(
  path.join(__dirname, "../firebase/functions/node_modules/firebase-admin"),
);

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.GCLOUD_PROJECT ||
  "gosenderr-6773f";

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
}

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
}

if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

module.exports = admin;

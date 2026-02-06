// Wrapper to load firebase-admin from workspace root, with fallback to functions install.
const path = require("path");
const { createRequire } = require("module");

const requireFromRepoRoot = createRequire(path.join(__dirname, "../package.json"));
let admin;
try {
  admin = requireFromRepoRoot("firebase-admin");
} catch (rootError) {
  try {
    admin = require(path.join(
      __dirname,
      "../firebase/functions/node_modules/firebase-admin",
    ));
  } catch (fallbackError) {
    throw rootError.code === "MODULE_NOT_FOUND" ? fallbackError : rootError;
  }
}

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

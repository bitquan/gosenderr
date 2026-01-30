// Wrapper to load firebase-admin from functions directory
const path = require("path");

// IMPORTANT: Set emulator environment variables BEFORE requiring firebase-admin
// This ensures the Admin SDK connects to emulator without needing credentials
if (process.env.FIRESTORE_EMULATOR_HOST && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  // Skip credential checks when using emulator
  process.env.FIREBASE_CONFIG = JSON.stringify({
    projectId: process.env.FIREBASE_PROJECT_ID || "gosenderr-6773f"
  });
}

const admin = require(
  path.join(__dirname, "../firebase/functions/node_modules/firebase-admin"),
);

// Only initialize if not already initialized
if (!admin.apps || admin.apps.length === 0) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "gosenderr-6773f"
  });
}

module.exports = admin;

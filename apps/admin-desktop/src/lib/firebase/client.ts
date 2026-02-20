import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getFunctions, Functions } from "firebase/functions";
import { getStorage, FirebaseStorage } from "firebase/storage";

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT || "";
const isEmulatorMode =
  import.meta.env.DEV && (
    import.meta.env.VITE_ADMIN_DESKTOP_USE_EMULATORS === "true" ||
    import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true" ||
    Boolean(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST) ||
    Boolean(import.meta.env.VITE_FIRESTORE_EMULATOR_HOST)
  );

const emulatorApiKeyFallback = "AIzaSyA-LOCAL-EMULATOR-KEY-0000000000000000";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || (isEmulatorMode ? emulatorApiKeyFallback : ""),
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    (projectId ? `${projectId}.firebaseapp.com` : ""),
  projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Only initialize on client side (not during build/SSR)
const isBrowser = typeof window !== "undefined";
const isValidConfig =
  (firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith("AIza")) ||
  Boolean(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST) ||
  Boolean(import.meta.env.VITE_FIRESTORE_EMULATOR_HOST) ||
  Boolean(firebaseConfig.projectId);

let app: FirebaseApp | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;
let functionsInstance: Functions | undefined;

if (isBrowser && isValidConfig) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
    storageInstance = getStorage(app);
    functionsInstance = getFunctions(app, "us-central1");
    console.log("Firebase initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
  }
} else if (isBrowser) {
  console.error(
    "Firebase config is invalid or missing. Check your .env.local file",
  );
}

// Export with safe getters that throw meaningful errors
export { app };

export const db = dbInstance as Firestore;
export const storage = storageInstance as FirebaseStorage;
export const functions = functionsInstance as Functions;

// Helper to check if Firebase is ready
export const isFirebaseReady = () => !!dbInstance;

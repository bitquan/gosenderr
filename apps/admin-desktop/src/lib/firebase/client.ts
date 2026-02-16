import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getFunctions, Functions } from "firebase/functions";
import { getStorage, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    import.meta.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    "",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    import.meta.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    import.meta.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    import.meta.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    import.meta.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    "",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    import.meta.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    "",
};

// Only initialize on client side (not during build/SSR)
const isBrowser = typeof window !== "undefined";
const isValidConfig =
  Boolean(firebaseConfig.projectId) ||
  (firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith("AIza"));

if (isBrowser && !isValidConfig) {
  console.error(
    "Firebase config appears missing or incomplete. Ensure VITE_FIREBASE_* or NEXT_PUBLIC_FIREBASE_* variables are set in your .env." +
      ` Current: apiKey=${
        firebaseConfig.apiKey ? "set" : "missing"
      }, projectId=${firebaseConfig.projectId || "missing"}`,
  );
}

let app: FirebaseApp | undefined;
let dbInstance: Firestore | undefined;
let storageInstance: FirebaseStorage | undefined;
let functionsInstance: Functions | undefined;

if (isBrowser && isValidConfig) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
    storageInstance = getStorage(app);
    functionsInstance = getFunctions(app);
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

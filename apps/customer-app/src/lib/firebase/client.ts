import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getFirestore, Firestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, Functions } from "firebase/functions";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getAuth, connectAuthEmulator } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

// Only initialize on client side (not during build/SSR)
const isBrowser = typeof window !== "undefined";
const isValidConfig =
  firebaseConfig.apiKey && firebaseConfig.apiKey.startsWith("AIza");

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
    // If CI or local E2E sets emulator env vars, connect SDK to the emulators so tests operate against them.
    try {
      const authEmulator = (import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || "").trim();
      if (authEmulator) {
        const auth = getAuth(app);
        // authEmulator expected as host:port
        const [host, port] = authEmulator.split(":");
        connectAuthEmulator(auth, `http://${host}:${port}`, { disableWarnings: true });
        console.log(`Connected Auth to emulator http://${host}:${port}`);
      }
    } catch (err) {
      console.warn("Failed to connect Auth emulator:", err);
    }

    try {
      const firestoreEmulator = (import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || "").trim();
      if (firestoreEmulator && dbInstance) {
        const [host, portStr] = firestoreEmulator.split(":");
        const port = Number(portStr || 8085);
        connectFirestoreEmulator(dbInstance, host, port);
        console.log(`Connected Firestore to emulator ${host}:${port}`);
      }
    } catch (err) {
      console.warn("Failed to connect Firestore emulator:", err);
    }
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


// Export with safe getters that throw meaningful errors
export { app };

export const db = dbInstance as Firestore;
export const storage = storageInstance as FirebaseStorage;
export const functions = functionsInstance as Functions;

// Helper to check if Firebase is ready
export const isFirebaseReady = () => !!dbInstance;

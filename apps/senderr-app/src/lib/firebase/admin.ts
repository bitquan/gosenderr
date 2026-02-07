import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

// Lazy initialization function
function initializeFirebaseAdmin() {
  if (!getApps().length) {
    // Check if service account is provided
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        initializeApp({
          credential: cert(serviceAccount),
        });
      } catch (error) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT:", error);
        throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT configuration");
      }
    } else {
      // Fallback to individual environment variables
      initializeApp({
        credential: cert({
          projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
    }
  }
}

// Lazy getter for Firestore
let firestoreInstance: Firestore | null = null;

export function getDb(): Firestore {
  if (!firestoreInstance) {
    initializeFirebaseAdmin();
    firestoreInstance = getFirestore();
  }
  return firestoreInstance;
}

// For backward compatibility
export const db = new Proxy({} as Firestore, {
  get(target, prop) {
    return (getDb() as any)[prop];
  },
});

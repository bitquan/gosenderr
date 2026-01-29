import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signOut as firebaseSignOut,
  Auth,
} from "firebase/auth";
import { app } from "./client";

// Lazy getter for auth instance
function getAuthInstance(): Auth | null {
  if (typeof window === "undefined") {
    console.warn("Firebase Auth: not in browser context");
    return null;
  }

  if (!app) {
    console.error(
      "Firebase Auth: app not initialized. Check environment variables.",
    );
    return null;
  }

  try {
    return getAuth(app);
  } catch (error) {
    console.error("Failed to initialize Firebase Auth:", error);
    return null;
  }
}

export const getAuthSafe = getAuthInstance;

// For backwards compatibility - export null/undefined, never call getAuth at module load
export const auth: Auth | null = null;

export interface PhoneAuthResult {
  confirmationResult: ConfirmationResult;
  verifier: RecaptchaVerifier;
}

/**
 * Initialize reCAPTCHA verifier for phone auth
 */
export function initRecaptchaVerifier(
  elementId: string,
): RecaptchaVerifier | null {
  const authInstance = getAuthSafe();
  if (!authInstance) {
    console.error("Firebase Auth not available for reCAPTCHA");
    return null;
  }
  return new RecaptchaVerifier(authInstance, elementId, {
    size: "normal",
    callback: () => {
      // reCAPTCHA solved
    },
    "expired-callback": () => {
      // reCAPTCHA expired
    },
  });
}

/**
 * Send phone verification code
 */
export async function sendPhoneVerificationCode(
  phoneNumber: string,
  verifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  const authInstance = getAuthSafe();
  if (!authInstance) throw new Error("Firebase Auth not available");
  return signInWithPhoneNumber(authInstance, phoneNumber, verifier);
}

/**
 * Fallback: Email/Password sign in
 */
export async function signInWithEmail(email: string, password: string) {
  const authInstance = getAuthSafe();
  if (!authInstance) throw new Error("Firebase Auth not available");
  return signInWithEmailAndPassword(authInstance, email, password);
}

/**
 * Fallback: Email/Password sign up
 */
export async function signUpWithEmail(email: string, password: string) {
  const authInstance = getAuthSafe();
  if (!authInstance) throw new Error("Firebase Auth not available");
  return createUserWithEmailAndPassword(authInstance, email, password);
}

/**
 * Sign out current user
 */
export async function signOut() {
  const authInstance = getAuthSafe();
  if (!authInstance) throw new Error("Firebase Auth not available");
  return firebaseSignOut(authInstance);
}

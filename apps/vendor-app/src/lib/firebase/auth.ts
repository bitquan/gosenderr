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
export const auth: Auth | null = null;

export interface PhoneAuthResult {
  confirmationResult: ConfirmationResult;
  verifier: RecaptchaVerifier;
}

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

export async function sendPhoneVerificationCode(
  phoneNumber: string,
  verifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  const authInstance = getAuthSafe();
  if (!authInstance) throw new Error("Firebase Auth not available");
  return signInWithPhoneNumber(authInstance, phoneNumber, verifier);
}

export async function signInWithEmail(email: string, password: string) {
  const authInstance = getAuthSafe();
  if (!authInstance) throw new Error("Firebase Auth not available");
  return signInWithEmailAndPassword(authInstance, email, password);
}

export async function signUpWithEmail(email: string, password: string) {
  const authInstance = getAuthSafe();
  if (!authInstance) throw new Error("Firebase Auth not available");
  return createUserWithEmailAndPassword(authInstance, email, password);
}

export async function signOut() {
  const authInstance = getAuthSafe();
  if (!authInstance) throw new Error("Firebase Auth not available");
  return firebaseSignOut(authInstance);
}

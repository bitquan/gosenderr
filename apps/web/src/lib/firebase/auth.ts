import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signOut as firebaseSignOut,
  Auth,
} from 'firebase/auth';
import { app } from './client';

// Lazy initialization - only create auth when needed
let authInstance: Auth | null = null;

function getAuthInstance(): Auth | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!authInstance && app) {
    try {
      authInstance = getAuth(app);
    } catch (error) {
      console.error('Failed to initialize Firebase Auth:', error);
      return null;
    }
  }
  
  return authInstance;
}

export const auth = new Proxy({} as Auth, {
  get(target, prop) {
    const instance = getAuthInstance();
    if (!instance) return undefined;
    return (instance as any)[prop];
  }
});

export interface PhoneAuthResult {
  confirmationResult: ConfirmationResult;
  verifier: RecaptchaVerifier;
}

/**
 * Initialize reCAPTCHA verifier for phone auth
 */
export function initRecaptchaVerifier(elementId: string): RecaptchaVerifier {
  return new RecaptchaVerifier(auth, elementId, {
    size: 'normal',
    callback: () => {
      // reCAPTCHA solved
    },
    'expired-callback': () => {
      // reCAPTCHA expired
    },
  });
}

/**
 * Send phone verification code
 */
export async function sendPhoneVerificationCode(
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}

/**
 * Fallback: Email/Password sign in
 */
export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Fallback: Email/Password sign up
 */
export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

/**
 * Sign out current user
 */
export async function signOut() {
  return firebaseSignOut(auth);
}

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

// Lazy initialization - only get auth when needed
let _auth: Auth | undefined;

function getAuthInstance(): Auth {
  if (!_auth) {
    _auth = getAuth(app);
  }
  return _auth;
}

export const auth = typeof window !== 'undefined' ? getAuthInstance() : ({} as Auth);

export interface PhoneAuthResult {
  confirmationResult: ConfirmationResult;
  verifier: RecaptchaVerifier;
}

/**
 * Initialize reCAPTCHA verifier for phone auth
 */
export function initRecaptchaVerifier(elementId: string): RecaptchaVerifier {
  return new RecaptchaVerifier(getAuthInstance(), elementId, {
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
  return signInWithPhoneNumber(getAuthInstance(), phoneNumber, verifier);
}

/**
 * Fallback: Email/Password sign in
 */
export async function signInWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(getAuthInstance(), email, password);
}

/**
 * Fallback: Email/Password sign up
 */
export async function signUpWithEmail(email: string, password: string) {
  return createUserWithEmailAndPassword(getAuthInstance(), email, password);
}

/**
 * Sign out current user
 */
export async function signOut() {
  return firebaseSignOut(getAuthInstance());
}

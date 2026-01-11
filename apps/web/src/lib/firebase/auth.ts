import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { app } from './client';

export const auth = getAuth(app);

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

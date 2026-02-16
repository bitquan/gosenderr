import {
  onFirebaseAuthChanged,
  restoreSession,
  signIn,
  signUp,
  signOut,
} from '../authService';
import type {AuthServicePort} from '../ports/authPort';

export const authFirebaseAdapter: AuthServicePort = {
  restoreSession,
  signIn,
  signUp,
  signOut,
  onAuthStateChanged: onFirebaseAuthChanged,
};

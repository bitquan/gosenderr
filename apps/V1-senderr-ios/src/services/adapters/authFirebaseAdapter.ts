import {
  onFirebaseAuthChanged,
  restoreSession,
  signIn,
  signOut,
} from '../authService';
import type {AuthServicePort} from '../ports/authPort';

export const authFirebaseAdapter: AuthServicePort = {
  restoreSession,
  signIn,
  signOut,
  onAuthStateChanged: onFirebaseAuthChanged,
};

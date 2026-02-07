import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type Unsubscribe,
} from 'firebase/auth';

import {getFirebaseServices, isFirebaseReady} from './firebase';
import type {AuthSession} from '../types/auth';

const SESSION_KEY = '@senderr/auth/session';

const toSessionToken = (): string => `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

const normalizeDisplayName = (email: string): string => {
  const base = email.split('@')[0] || 'courier';
  return base.charAt(0).toUpperCase() + base.slice(1);
};

const persistSession = async (session: AuthSession | null): Promise<void> => {
  if (!session) {
    await AsyncStorage.removeItem(SESSION_KEY);
    return;
  }
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const restoreSession = async (): Promise<AuthSession | null> => {
  if (isFirebaseReady()) {
    const services = getFirebaseServices();
    if (services?.auth.currentUser) {
      const user = services.auth.currentUser;
      return {
        uid: user.uid,
        email: user.email ?? 'unknown@senderr.app',
        displayName: user.displayName ?? normalizeDisplayName(user.email ?? ''),
        token: await user.getIdToken(),
        provider: 'firebase',
      };
    }
  }

  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }
};

export const signIn = async (email: string, password: string): Promise<AuthSession> => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) {
    throw new Error('Email and password are required.');
  }

  if (isFirebaseReady()) {
    const services = getFirebaseServices();
    if (!services) {
      throw new Error('Firebase configuration is missing.');
    }

    const credential = await signInWithEmailAndPassword(services.auth, normalizedEmail, password);
    const token = await credential.user.getIdToken();
    const session: AuthSession = {
      uid: credential.user.uid,
      email: credential.user.email ?? normalizedEmail,
      displayName:
        credential.user.displayName ?? normalizeDisplayName(credential.user.email ?? normalizedEmail),
      token,
      provider: 'firebase',
    };
    await persistSession(session);
    return session;
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  const session: AuthSession = {
    uid: `mock_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}`,
    email: normalizedEmail,
    displayName: normalizeDisplayName(normalizedEmail),
    token: toSessionToken(),
    provider: 'mock',
  };

  await persistSession(session);
  return session;
};

export const signOut = async (): Promise<void> => {
  if (isFirebaseReady()) {
    const services = getFirebaseServices();
    if (services) {
      await firebaseSignOut(services.auth);
    }
  }

  await persistSession(null);
};

export const onFirebaseAuthChanged = (
  callback: (session: AuthSession | null) => void,
): Unsubscribe | null => {
  if (!isFirebaseReady()) {
    return null;
  }

  const services = getFirebaseServices();
  if (!services) {
    return null;
  }

  return onAuthStateChanged(services.auth, async user => {
    if (!user) {
      callback(null);
      return;
    }

    callback({
      uid: user.uid,
      email: user.email ?? 'unknown@senderr.app',
      displayName: user.displayName ?? normalizeDisplayName(user.email ?? ''),
      token: await user.getIdToken(),
      provider: 'firebase',
    });
  });
};

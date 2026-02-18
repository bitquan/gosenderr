import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type IdTokenResult,
  type Unsubscribe,
} from 'firebase/auth';
import {doc, getDoc, setDoc} from 'firebase/firestore';

import {getFirebaseServices, isFirebaseReady} from './firebase';
import {isMockAuthEnabled, runtimeConfig} from '../config/runtime';
import type {AuthSession} from '../types/auth';

const SESSION_KEY = '@senderr/auth/session';
const ROLE_CACHE_KEY = '@senderr/auth/role-cache';
const ROLE_CACHE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

type CourierRole = 'courier' | 'driver';

type CachedRole = {
  role: CourierRole;
  validatedAt: string;
};

const toSessionToken = (): string => `${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

const normalizeDisplayName = (email: string): string => {
  const base = email.split('@')[0] || 'courier';
  return base.charAt(0).toUpperCase() + base.slice(1);
};

const readRoleCache = async (): Promise<Record<string, CachedRole>> => {
  const raw = await AsyncStorage.getItem(ROLE_CACHE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, CachedRole>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const writeRoleCache = async (uid: string, role: CourierRole): Promise<void> => {
  const cache = await readRoleCache();
  cache[uid] = {
    role,
    validatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(cache));
};

const clearRoleCache = async (uid: string): Promise<void> => {
  const cache = await readRoleCache();
  if (!(uid in cache)) {
    return;
  }
  delete cache[uid];
  await AsyncStorage.setItem(ROLE_CACHE_KEY, JSON.stringify(cache));
};

const hasRecentRoleCache = async (uid: string): Promise<boolean> => {
  const cache = await readRoleCache();
  const entry = cache[uid];
  if (!entry) {
    return false;
  }

  const validatedAtMs = Date.parse(entry.validatedAt);
  if (!Number.isFinite(validatedAtMs)) {
    return false;
  }

  return Date.now() - validatedAtMs <= ROLE_CACHE_MAX_AGE_MS;
};

const hasAnyRoleCache = async (uid: string): Promise<boolean> => {
  const cache = await readRoleCache();
  const entry = cache[uid];
  return Boolean(entry?.role);
};

const normalizeCourierRole = (value: unknown): CourierRole | null => {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (normalized === 'courier' || normalized === 'driver') {
    return normalized;
  }
  return null;
};

const getCourierRoleFromClaims = (claims: Record<string, unknown>): CourierRole | null => {
  const directRole = normalizeCourierRole(claims.role);
  if (directRole) {
    return directRole;
  }

  if (claims.courier === true) {
    return 'courier';
  }

  if (claims.driver === true) {
    return 'driver';
  }

  if (Array.isArray(claims.roles)) {
    for (const role of claims.roles) {
      const normalized = normalizeCourierRole(role);
      if (normalized) {
        return normalized;
      }
    }
  }

  return null;
};

const getClaims = async (getTokenResult: () => Promise<IdTokenResult>): Promise<Record<string, unknown> | null> => {
  try {
    const tokenResult = await getTokenResult();
    return (tokenResult.claims ?? {}) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const isTransientRoleLookupError = (error: unknown): boolean => {
  const code = String((error as {code?: unknown})?.code ?? '').toLowerCase();
  const message = String((error as {message?: unknown})?.message ?? '').toLowerCase();

  return (
    code.includes('unavailable') ||
    code.includes('deadline-exceeded') ||
    message.includes('offline') ||
    message.includes('network')
  );
};

const assertCourierRole = async (
  uid: string,
  options: {idTokenClaims?: Record<string, unknown> | null; email?: string | null} = {},
): Promise<void> => {
  const services = getFirebaseServices();
  if (!services) {
    throw new Error('Firebase services are not ready.');
  }

  try {
    const userRef = doc(services.db, 'users', uid);
    const userSnap = await getDoc(userRef);
    const roleFromClaims = options.idTokenClaims
      ? getCourierRoleFromClaims(options.idTokenClaims)
      : null;

    if (!userSnap.exists()) {
      if (runtimeConfig.envName !== 'prod') {
        const bootstrapRole: CourierRole = roleFromClaims ?? 'courier';
        await setDoc(
          userRef,
          {
            role: bootstrapRole,
            email: options.email ?? null,
            createdBy: 'courier-ios-bootstrap',
            updatedAt: new Date().toISOString(),
          },
          {merge: true},
        );
        await writeRoleCache(uid, bootstrapRole);
        return;
      }

      await clearRoleCache(uid);
      throw new Error('No courier profile found for this account.');
    }

    const role = normalizeCourierRole((userSnap.data() as {role?: unknown}).role);
    if (!role) {
      if (runtimeConfig.envName !== 'prod') {
        const bootstrapRole: CourierRole = roleFromClaims ?? 'courier';
        await setDoc(
          userRef,
          {
            role: bootstrapRole,
            updatedAt: new Date().toISOString(),
          },
          {merge: true},
        );
        await writeRoleCache(uid, bootstrapRole);
        return;
      }

      await clearRoleCache(uid);
      throw new Error('This account does not have courier access.');
    }

    await writeRoleCache(uid, role);
  } catch (error) {
    if (isTransientRoleLookupError(error)) {
      const roleFromClaims = options.idTokenClaims
        ? getCourierRoleFromClaims(options.idTokenClaims)
        : null;
      if (roleFromClaims) {
        await writeRoleCache(uid, roleFromClaims);
        return;
      }

      if ((await hasRecentRoleCache(uid)) || (await hasAnyRoleCache(uid))) {
        return;
      }

      throw new Error('Unable to verify courier access while offline. Reconnect and try again.');
    }

    throw error;
  }
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
      const idTokenClaims = await getClaims(() => user.getIdTokenResult());
      try {
        await assertCourierRole(user.uid, {idTokenClaims, email: user.email ?? null});
      } catch {
        await firebaseSignOut(services.auth);
        await persistSession(null);
        return null;
      }
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

  if (!isMockAuthEnabled()) {
    await AsyncStorage.removeItem(SESSION_KEY);
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (parsed.provider !== 'mock') {
      await AsyncStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
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
    const idTokenClaims = await getClaims(() => credential.user.getIdTokenResult());
    try {
      await assertCourierRole(credential.user.uid, {
        idTokenClaims,
        email: credential.user.email ?? normalizedEmail,
      });
    } catch (error) {
      await firebaseSignOut(services.auth);
      throw error;
    }

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

  if (!isMockAuthEnabled()) {
    throw new Error(
      'Firebase auth is required. Configure SENDERR_FIREBASE_* and GoogleService-Info.plist, or enable SENDERR_ALLOW_MOCK_AUTH=1 for local-only development.',
    );
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

    const idTokenClaims = await getClaims(() => user.getIdTokenResult());
    try {
      await assertCourierRole(user.uid, {idTokenClaims});
    } catch {
      await firebaseSignOut(services.auth);
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

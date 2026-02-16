import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {useServiceRegistry} from '../services/serviceRegistry';
import type {AuthSession} from '../types/auth';

const onboardingStorageKey = (uid: string): string => `@senderr/auth/onboarding/${uid}`;

type AuthContextValue = {
  session: AuthSession | null;
  initializing: boolean;
  signingIn: boolean;
  signingUp: boolean;
  onboardingRequired: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({children}: {children: React.ReactNode}): React.JSX.Element => {
  const {auth, analytics} = useServiceRegistry();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [signingUp, setSigningUp] = useState(false);
  const [onboardingRequired, setOnboardingRequired] = useState(false);
  const lastTrackedSessionUid = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const initialize = async (): Promise<void> => {
      try {
        await analytics.initialize();
        const restored = await auth.restoreSession();
        if (mounted) {
          setSession(restored);
          setInitializing(false);
        }
      } catch (error) {
        if (mounted) {
          setInitializing(false);
        }
        void analytics.recordError(error, 'auth_restore_session_failed');
      }
    };

    void initialize();

    const unsubscribe = auth.onAuthStateChanged(nextSession => {
      if (mounted) {
        setSession(nextSession);
      }
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [analytics, auth]);

  useEffect(() => {
    let mounted = true;

    const hydrateOnboardingState = async (): Promise<void> => {
      if (!session?.uid) {
        if (mounted) {
          setOnboardingRequired(false);
        }
        return;
      }

      try {
        const flag = await AsyncStorage.getItem(onboardingStorageKey(session.uid));
        if (mounted) {
          setOnboardingRequired(flag === 'required');
        }
      } catch {
        if (mounted) {
          setOnboardingRequired(false);
        }
      }
    };

    void hydrateOnboardingState();
    return () => {
      mounted = false;
    };
  }, [session?.uid]);

  useEffect(() => {
    if (session?.uid && session.uid !== lastTrackedSessionUid.current) {
      lastTrackedSessionUid.current = session.uid;
      void analytics.identifyUser(session);
      void analytics.track('auth_signed_in', {
        provider: session.provider,
      });
      return;
    }

    if (!session && lastTrackedSessionUid.current) {
      lastTrackedSessionUid.current = null;
      void analytics.track('auth_signed_out');
      void analytics.clearUser();
    }
  }, [analytics, session]);

  const signInWithEmail = async (email: string, password: string): Promise<void> => {
    setSigningIn(true);
    try {
      const nextSession = await auth.signIn(email, password);
      setSession(nextSession);
    } catch (error) {
      void analytics.recordError(error, 'auth_sign_in_failed');
      throw error;
    } finally {
      setSigningIn(false);
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName?: string,
  ): Promise<void> => {
    setSigningUp(true);
    try {
      const nextSession = await auth.signUp(email, password, displayName);
      await AsyncStorage.setItem(onboardingStorageKey(nextSession.uid), 'required');
      setSession(nextSession);
      setOnboardingRequired(true);
      void analytics.track('auth_signed_up', {
        provider: nextSession.provider,
      });
    } catch (error) {
      void analytics.recordError(error, 'auth_sign_up_failed');
      throw error;
    } finally {
      setSigningUp(false);
    }
  };

  const completeOnboarding = async (): Promise<void> => {
    if (!session?.uid) {
      setOnboardingRequired(false);
      return;
    }

    await AsyncStorage.removeItem(onboardingStorageKey(session.uid));
    setOnboardingRequired(false);
    void analytics.track('onboarding_completed', {
      provider: session.provider,
    });
  };

  const signOutUser = async (): Promise<void> => {
    try {
      await auth.signOut();
      setSession(null);
      setOnboardingRequired(false);
    } catch (error) {
      void analytics.recordError(error, 'auth_sign_out_failed');
      throw error;
    }
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      initializing,
      signingIn,
      signingUp,
      onboardingRequired,
      signInWithEmail,
      signUpWithEmail,
      completeOnboarding,
      signOutUser,
    }),
    [session, initializing, signingIn, signingUp, onboardingRequired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }
  return context;
};

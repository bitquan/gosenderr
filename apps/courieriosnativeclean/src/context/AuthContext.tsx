import React, {createContext, useContext, useEffect, useMemo, useRef, useState} from 'react';

import {useServiceRegistry} from '../services/serviceRegistry';
import type {AuthSession} from '../types/auth';

type AuthContextValue = {
  session: AuthSession | null;
  initializing: boolean;
  signingIn: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({children}: {children: React.ReactNode}): React.JSX.Element => {
  const {auth, analytics} = useServiceRegistry();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
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

  const signOutUser = async (): Promise<void> => {
    try {
      await auth.signOut();
      setSession(null);
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
      signInWithEmail,
      signOutUser,
    }),
    [session, initializing, signingIn],
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

import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';

import {onFirebaseAuthChanged, restoreSession, signIn, signOut} from '../services/authService';
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
  const [session, setSession] = useState<AuthSession | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initialize = async (): Promise<void> => {
      const restored = await restoreSession();
      if (mounted) {
        setSession(restored);
        setInitializing(false);
      }
    };

    void initialize();

    const unsubscribe = onFirebaseAuthChanged(nextSession => {
      if (mounted) {
        setSession(nextSession);
      }
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string): Promise<void> => {
    setSigningIn(true);
    try {
      const nextSession = await signIn(email, password);
      setSession(nextSession);
    } finally {
      setSigningIn(false);
    }
  };

  const signOutUser = async (): Promise<void> => {
    await signOut();
    setSession(null);
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

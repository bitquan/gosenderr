import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
type User = any;
const { onAuthStateChanged } = require('firebase/auth');
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  db,
  getAuthSafe,
  isFirebaseReady,
  signInWithEmail,
  signOut as signOutHelper,
  signUpWithEmail,
} from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const authInstance = getAuthSafe();
    if (!authInstance) {
      setLoading(false);
      return;
    }

    let active = true;

    const ensureUserProfile = async (nextUser: User) => {
      if (!isFirebaseReady()) return;
      try {
        const userRef = doc(db, 'users', nextUser.uid);
        const getProfile = getDoc(userRef);
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timed out loading courier profile')), 12000),
        );
        const snapshot = await Promise.race([getProfile, timeout]);
        if (!snapshot.exists()) {
          await setDoc(userRef, {
            email: nextUser.email?.toLowerCase() || '',
            fullName: nextUser.displayName || '',
            role: 'courier',
            createdAt: serverTimestamp(),
            courierProfile: {
              onboardingCompleted: false,
              status: null,
              isOnline: false,
              workModes: {
                packagesEnabled: false,
                foodEnabled: false,
              },
              packageRateCard: {
                baseFare: 3,
                perMile: 0.5,
                perMinute: 0.1,
                optionalFees: [],
              },
              foodRateCard: {
                baseFare: 2.5,
                perMile: 0.75,
                restaurantWaitPay: 0.15,
                optionalFees: [],
              },
              stats: {
                totalDeliveries: 0,
                totalEarnings: 0,
                rating: 0,
                completionRate: 0,
              },
            },
          });
        }
      } catch (error) {
        console.error('Failed to ensure user profile', error);
      }
    };

    const unsubscribe = onAuthStateChanged(authInstance, (nextUser: User | null) => {
      if (!active) return;
      setUser(nextUser);
      setLoading(false);
      if (nextUser) {
        void ensureUserProfile(nextUser);
      }
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmail(email, password);
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    await signUpWithEmail(email, password, fullName);
  };

  const signOut = async () => {
    await signOutHelper();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

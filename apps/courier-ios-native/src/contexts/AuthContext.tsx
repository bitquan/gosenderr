import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, getAuthSafe, signInWithEmail, signOut as signOutHelper } from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
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

    const unsubscribe = onAuthStateChanged(authInstance, async (nextUser) => {
      if (nextUser) {
        try {
          const userRef = doc(db, 'users', nextUser.uid);
          const snapshot = await getDoc(userRef);
          if (!snapshot.exists()) {
            await setDoc(userRef, {
              email: nextUser.email?.toLowerCase() || '',
              fullName: nextUser.displayName || '',
              role: 'courier',
              createdAt: serverTimestamp(),
              courierProfile: {
                isOnline: false,
                workModes: {
                  packagesEnabled: false,
                  foodEnabled: false,
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
      }
      setUser(nextUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmail(email, password);
  };

  const signOut = async () => {
    await signOutHelper();
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
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

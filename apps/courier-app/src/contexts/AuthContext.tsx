import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db, getAuthSafe, signOut as signOutHelper } from '../lib/firebase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const authInstance = getAuthSafe();
    console.log('🔐 AuthContext: Initializing auth listener', { hasAuth: !!authInstance });
    
    if (!authInstance) {
      console.error('🔐 AuthContext: Auth is not initialized!');
      setLoading(false)
      return
    }

    console.log('🔐 AuthContext: Setting up onAuthStateChanged listener');
    const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
      console.log('🔐 AuthContext: Auth state changed', { 
        hasUser: !!user, 
        uid: user?.uid,
        email: user?.email 
      });
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid)
          const snapshot = await getDoc(userRef)
          if (!snapshot.exists()) {
            await setDoc(userRef, {
              email: user.email?.toLowerCase() || '',
              fullName: user.displayName || '',
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
            })
          }
        } catch (error) {
          console.error('🔐 AuthContext: Failed to ensure user profile', error)
        }
      }
      setUser(user)
      setLoading(false)
    }, (error) => {
      console.error('🔐 AuthContext: Auth state error', error);
      setLoading(false);
    })

    return unsubscribe
  }, [])

  const signOut = async () => {
    await signOutHelper()
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

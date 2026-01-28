import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '../lib/firebase'

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
    console.log('🔐 AuthContext: Initializing auth listener', { hasAuth: !!auth });
    
    if (!auth) {
      console.error('🔐 AuthContext: Auth is not initialized!');
      setLoading(false)
      return
    }

    console.log('🔐 AuthContext: Setting up onAuthStateChanged listener');
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔐 AuthContext: Auth state changed', { 
        hasUser: !!user, 
        uid: user?.uid,
        email: user?.email 
      });
      setUser(user)
      setLoading(false)
    }, (error) => {
      console.error('🔐 AuthContext: Auth state error', error);
      setLoading(false);
    })

    return unsubscribe
  }, [])

  const signOut = async () => {
    if (!auth) return
    await firebaseSignOut(auth)
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

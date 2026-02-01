import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  User,
  onAuthStateChanged,
  onIdTokenChanged,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth'
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
    if (!auth) {
      setLoading(false)
      return
    }

    let unsubscribeAuth: (() => void) | null = null
    let unsubscribeToken: (() => void) | null = null

    const initAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence)
      } catch (error) {
        console.error('Failed to set auth persistence:', error)
      }

      unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        setUser(user)
        setLoading(false)
      })

      unsubscribeToken = onIdTokenChanged(auth, (user) => {
        if (user) setUser(user)
      })
    }

    initAuth()

    const handleFocus = async () => {
      try {
        await auth.currentUser?.getIdToken(true)
      } catch (error) {
        console.warn('Failed to refresh auth token:', error)
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      unsubscribeAuth?.()
      unsubscribeToken?.()
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
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

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

    let refreshInFlight: Promise<void> | null = null
    let lastRefreshAt = 0

    const handleFocus = async () => {
      if (document.visibilityState === 'hidden') return
      if (!navigator.onLine) return
      if (!auth.currentUser) return

      const now = Date.now()
      if (now - lastRefreshAt < 60_000) return
      if (refreshInFlight) return

      refreshInFlight = auth.currentUser
        .getIdToken(true)
        .then(() => {
          lastRefreshAt = Date.now()
        })
        .catch((error: any) => {
          if (error?.code === 'auth/network-request-failed') return
          console.warn('Failed to refresh auth token:', error)
        })
        .finally(() => {
          refreshInFlight = null
        })
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

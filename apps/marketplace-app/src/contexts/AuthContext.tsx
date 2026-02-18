import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, onAuthStateChanged, signOut as firebaseSignOut } from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth } from '../lib/firebase'
import { db } from '../lib/firebase/client'

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

    const ensureUserProfile = async (user: User) => {
      try {
        const userRef = doc(db, 'users', user.uid)
        const userSnap = await getDoc(userRef)

        if (!userSnap.exists()) {
          await setDoc(
            userRef,
            {
              email: user.email || null,
              displayName: user.displayName || user.email?.split('@')[0] || 'Customer',
              role: 'customer',
              roles: ['buyer', 'seller'],
              profilePhotoUrl: user.photoURL || '',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              buyerProfile: {
                favoriteItems: [],
                savedSearches: [],
                purchaseHistory: [],
              },
              sellerProfile: null,
              averageRating: 0,
              totalRatings: 0,
            },
            { merge: true },
          )
          console.info('Created missing user profile document for signed-in user', user.uid)
        }
      } catch (error) {
        console.warn('Failed to ensure user profile document', error)
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setLoading(false)

      if (user && db) {
        void ensureUserProfile(user)
      }
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

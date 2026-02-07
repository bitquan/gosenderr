import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from './useAuth'

export function useAdmin() {
  const { user } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      setLoading(false)
      return
    }

    const checkAdmin = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const userData = userDoc.data()
          setIsAdmin(userData.role === 'admin')
        }
      } catch (error) {
        console.error('Error checking admin status:', error)
      } finally {
        setLoading(false)
      }
    }

    checkAdmin()
  }, [user])

  return { isAdmin, loading }
}

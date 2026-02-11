import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { useAuth } from './useAuth'
import { db } from '../lib/firebase/client'

export type UserRole = 'customer' | 'courier' | 'admin' | 'buyer' | 'seller' | 'package_runner'

export interface UseRoleReturn {
  role: UserRole | null
  primaryRole: UserRole | null
  roles: UserRole[]
  loading: boolean
  hasRole: (role: UserRole) => boolean
  isCustomer: boolean
  isSeller: boolean
  isCourier: boolean
  isAdmin: boolean
}

/**
 * Hook to access the current user's role(s) from Firestore
 * Supports multi-role users with a primary role
 */
export function useRole(): UseRoleReturn {
  const { user, loading: authLoading } = useAuth()
  const [role, setRole] = useState<UserRole | null>(null)
  const [primaryRole, setPrimaryRole] = useState<UserRole | null>(null)
  const [roles, setRoles] = useState<UserRole[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) return

    if (!user || !db) {
      setRole(null)
      setPrimaryRole(null)
      setRoles([])
      setLoading(false)
      return
    }

    // Listen to user document for role changes
    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data()
          const userRole = data.role || data.primaryRole || null
          const userPrimaryRole = data.primaryRole || data.role || null
          const userRoles = data.roles || (userRole ? [userRole] : [])

          if (!userRole && userRoles.length === 0) {
            setRole('customer')
            setPrimaryRole('customer')
            setRoles(['customer'])
          } else {
            setRole(userRole)
            setPrimaryRole(userPrimaryRole)
            setRoles(userRoles)
          }
        } else {
          setRole('customer')
          setPrimaryRole('customer')
          setRoles(['customer'])
        }
        setLoading(false)
      },
      (error) => {
        console.error('Error fetching user role:', error)
        setRole(null)
        setPrimaryRole(null)
        setRoles([])
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user, authLoading])

  const hasRole = (checkRole: UserRole): boolean => {
    return roles.includes(checkRole)
  }

  return {
    role,
    primaryRole,
    roles,
    loading: authLoading || loading,
    hasRole,
    isCustomer: hasRole('customer') || hasRole('buyer'),
    isSeller: hasRole('seller'),
    isCourier: hasRole('courier'),
    isAdmin: hasRole('admin')
  }
}

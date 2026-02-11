import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { doc, getDoc } from 'firebase/firestore'
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

const RoleContext = createContext<UseRoleReturn | undefined>(undefined)

function useRoleSubscription(): UseRoleReturn {
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

    let cancelled = false

    const loadRole = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'users', user.uid))
        if (cancelled) return

        if (snapshot.exists()) {
          const data = snapshot.data()
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
      } catch (error) {
        if (cancelled) return
        console.error('Error fetching user role:', error)
        setRole(null)
        setPrimaryRole(null)
        setRoles([])
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadRole()

    return () => {
      cancelled = true
    }
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
    isAdmin: hasRole('admin'),
  }
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const value = useRoleSubscription()
  return React.createElement(RoleContext.Provider, { value }, children)
}

export function useRole(): UseRoleReturn {
  const context = useContext(RoleContext)
  if (context) {
    return context
  }
  return useRoleSubscription()
}

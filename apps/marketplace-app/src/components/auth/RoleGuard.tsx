import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useRole, UserRole } from '../../hooks/useRole'

interface RoleGuardProps {
  children: ReactNode
  allowedRoles: UserRole[]
  redirectTo?: string
}

/**
 * RoleGuard - Protects routes by checking if user has required role
 * Redirects to appropriate page if user lacks permission
 */
export function RoleGuard({ children, allowedRoles, redirectTo }: RoleGuardProps) {
  const { user, loading: authLoading } = useAuth()
  const { roles, loading: roleLoading } = useRole()

  // Show loading state while checking authentication and roles
  if (authLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Check if user has any of the allowed roles
  const hasPermission = roles.some(role => allowedRoles.includes(role))

  // Redirect if user doesn't have permission
  if (!hasPermission) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />
    }
    
    // Default redirect based on user's primary role
    if (roles.includes('customer') || roles.includes('buyer')) {
      return <Navigate to="/dashboard" replace />
    } else if (roles.includes('seller')) {
      return <Navigate to="/seller/dashboard" replace />
    } else if (roles.includes('courier')) {
      return <Navigate to="/courier/dashboard" replace />
    } else if (roles.includes('admin')) {
      return <Navigate to="/admin/dashboard" replace />
    }
    
    // Fallback to unauthorized page
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

interface PublicOnlyRouteProps {
  children: ReactNode
  redirectTo?: string
}

/**
 * PublicOnlyRoute - Redirects authenticated users away from public pages
 * Useful for login/signup pages
 */
export function PublicOnlyRoute({ children, redirectTo = '/dashboard' }: PublicOnlyRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return <Navigate to={redirectTo} replace />
  }

  return <>{children}</>
}

import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * ProtectedRoute - Ensures user is authenticated before accessing route
 * Redirects to login if not authenticated
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  console.log('ProtectedRoute - loading:', loading, 'user:', user?.email || 'none')

  if (loading) {
    console.log('Showing loading spinner')
    return (
      <div className="flex items-center justify-center min-h-screen bg-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-purple-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    console.log('No user, redirecting to /login')
    return <Navigate to="/login" replace />
  }

  console.log('User authenticated, rendering children')
  return <>{children}</>
}

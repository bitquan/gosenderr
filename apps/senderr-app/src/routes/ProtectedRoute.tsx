import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { debugLogger } from '@/utils/debugLogger'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  useEffect(() => {
    debugLogger.log('route', `ProtectedRoute - Path: ${location.pathname}`, {
      hasUser: !!user,
      loading,
      pathname: location.pathname,
      search: location.search,
    })
  }, [location.pathname, location.search, user, loading])

  if (loading) {
    debugLogger.log('render', 'ProtectedRoute showing loading spinner')
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!user) {
    const redirect = encodeURIComponent(`${location.pathname}${location.search || ''}`)
    debugLogger.log('route', 'ProtectedRoute redirecting to login - no user', {
      redirect,
    })
    return <Navigate to={`/login?redirect=${redirect}`} replace />
  }

  debugLogger.log('render', 'ProtectedRoute rendering Outlet')
  return <Outlet />
}

export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (user) {
    const params = new URLSearchParams(location.search)
    const redirect = params.get('redirect')
    if (redirect && redirect.startsWith('/')) {
      return <Navigate to={redirect} replace />
    }
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

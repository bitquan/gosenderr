import { Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { NavigationProvider } from './contexts/NavigationContext'
import { useAuth } from './hooks/useAuth'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useEffect } from 'react'
import { debugLogger } from './utils/debugLogger'

// Layouts
import CourierLayout from './layouts/CourierLayout'

// Pages
import SimpleDashboard from './pages/SimpleDashboard'
import SimpleJobDetail from './pages/SimpleJobDetail'
import DashboardPage from './pages/dashboard/page'
import LoginPage from './pages/Login'
import SignupPage from './pages/Signup'
import JobDetailPage from './pages/jobs/[jobId]/page'
import ActiveNavigationPage from './pages/navigation/active'
import RoutesPage from './pages/routes/page'
import ActiveRoutePage from './pages/active-route/page'
import SettingsPage from './pages/settings/page'
import SupportPage from './pages/support/page'
import OnboardingPage from './pages/onboarding/page'
import StripeOnboardingPage from './pages/onboarding/stripe/page'
import RateCardsPage from './pages/rate-cards/page'
import EquipmentPage from './pages/equipment/page'
import SetupPage from './pages/setup/page'
import EarningsPage from './pages/earnings/page'

function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  
  useEffect(() => {
    debugLogger.log('route', `ProtectedRoute - Path: ${location.pathname}`, {
      hasUser: !!user,
      loading,
      pathname: location.pathname,
      search: location.search
    })
  }, [location.pathname, user, loading])
  
  if (loading) {
    debugLogger.log('render', 'ProtectedRoute showing loading spinner')
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  }
  
  if (!user) {
    debugLogger.log('route', 'ProtectedRoute redirecting to login - no user')
    return <Navigate to="/login" replace />
  }
  
  debugLogger.log('render', 'ProtectedRoute rendering Outlet')
  return <Outlet />
}

function App() {
  useEffect(() => {
    debugLogger.log('info', 'Courier App mounted', {
      url: window.location.href,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    })
    
    // Print report after 5 seconds
    const timer = setTimeout(() => {
      console.log('\n\n📋 Debug report ready! Run in console:')
      console.log('  printDebugReport()    - Print to console')
      console.log('  downloadDebugReport() - Download as .md file')
    }, 5000)
    
    return () => clearTimeout(timer)
  }, [])
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NavigationProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            
            <Route element={<ProtectedRoute />}>
              {/* Simple routes without layout */}
              <Route path="/" element={<SimpleDashboard />} />
              <Route path="/dashboard" element={<SimpleDashboard />} />
              <Route path="/jobs/:jobId" element={<SimpleJobDetail />} />
              
              {/* Other routes with layout */}
              <Route element={<CourierLayout />}>
                <Route path="/routes" element={<RoutesPage />} />
                <Route path="/active-route" element={<ActiveRoutePage />} />
                <Route path="/jobs" element={<RoutesPage />} />
                <Route path="/navigation/active" element={<ActiveNavigationPage />} />
                <Route path="/earnings" element={<EarningsPage />} />
                <Route path="/rate-cards" element={<RateCardsPage />} />
                <Route path="/equipment" element={<EquipmentPage />} />
                <Route path="/setup" element={<SetupPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/support" element={<SupportPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="/onboarding/stripe" element={<StripeOnboardingPage />} />
                <Route path="/old-dashboard" element={<DashboardPage />} />
                <Route path="/old-job-detail/:jobId" element={<JobDetailPage />} />
              </Route>
            </Route>
        </Routes>
        </NavigationProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

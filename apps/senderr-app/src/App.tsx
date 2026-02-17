import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { NavigationProvider } from './contexts/NavigationContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useEffect } from 'react'
import { debugLogger } from './utils/debugLogger'
import { ProtectedRoute, PublicOnlyRoute } from './routes/ProtectedRoute'

// Layouts
import CourierLayout from './layouts/CourierLayout'

// Pages
import DashboardPage from './pages/dashboard/page'
import LoginPage from './pages/Login'
import SignupPage from './pages/Signup'
import JobsPage from './pages/Jobs'
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
import ProfilePage from './pages/Profile'
import { StripeModeBanner } from './components/StripeModeBanner'

const JobDetailPage = lazy(() => import('./pages/jobs/[jobId]/page'))
const ActiveNavigationPage = lazy(() => import('./pages/navigation/active'))

function App() {
  useEffect(() => {
    debugLogger.log('info', 'Senderr App mounted', {
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
        <StripeModeBanner />
          <Routes>
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
            
            <Route element={<ProtectedRoute />}>
            <Route element={<CourierLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/routes" element={<RoutesPage />} />
              <Route path="/active-route" element={<ActiveRoutePage />} />
              <Route
                path="/jobs/:jobId"
                element={
                  <Suspense fallback={<div className="p-6 text-sm text-gray-600">Loading job map…</div>}>
                    <JobDetailPage />
                  </Suspense>
                }
              />
              <Route path="/jobs" element={<JobsPage />} />
              <Route
                path="/navigation/active"
                element={
                  <Suspense fallback={<div className="p-6 text-sm text-gray-600">Loading navigation map…</div>}>
                    <ActiveNavigationPage />
                  </Suspense>
                }
              />
              <Route path="/earnings" element={<EarningsPage />} />
              <Route path="/rate-cards" element={<RateCardsPage />} />
              <Route path="/equipment" element={<EquipmentPage />} />
              <Route path="/setup" element={<SetupPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route path="/onboarding/stripe" element={<StripeOnboardingPage />} />
            </Route>
          </Route>
        </Routes>
        </NavigationProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

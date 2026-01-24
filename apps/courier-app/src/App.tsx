import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { ErrorBoundary } from './components/ErrorBoundary'

// Layouts
import CourierLayout from './layouts/CourierLayout'

// Pages
import DashboardPage from './pages/dashboard/page'
import LoginPage from './pages/Login'
import JobDetailPage from './pages/jobs/[jobId]/page'
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute><CourierLayout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/active-route" element={<ActiveRoutePage />} />
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />
            <Route path="/jobs" element={<RoutesPage />} />
            <Route path="/earnings" element={<EarningsPage />} />
            <Route path="/rate-cards" element={<RateCardsPage />} />
            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/setup" element={<SetupPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/onboarding/stripe" element={<StripeOnboardingPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

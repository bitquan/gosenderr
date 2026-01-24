import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'

// Layouts
import RunnerLayout from './layouts/RunnerLayout'

// Pages
import DashboardPage from './pages/dashboard/page'
import AvailableRoutesPage from './pages/available-routes/page'
import JobsPage from './pages/jobs/page'
import EarningsPage from './pages/earnings/page'
import ProfilePage from './pages/profile/page'
import SettingsPage from './pages/settings/page'
import SupportPage from './pages/support/page'
import OnboardingPage from './pages/onboarding/page'

// Auth pages
import LoginPage from './pages/Login'
import SignupPage from './pages/Signup'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  
  console.log('ProtectedRoute - loading:', loading, 'user:', user?.email || 'none')
  
  if (loading) {
    console.log('Showing loading spinner')
    return <div className="flex items-center justify-center min-h-screen bg-purple-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
        <p className="text-purple-600">Loading...</p>
      </div>
    </div>
  }
  
  if (!user) {
    console.log('No user, redirecting to /login')
    return <Navigate to="/login" replace />
  }
  
  console.log('User authenticated, rendering children')
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <RunnerLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/available-routes" element={<AvailableRoutesPage />} />
                  <Route path="/jobs" element={<JobsPage />} />
                  <Route path="/earnings" element={<EarningsPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/support" element={<SupportPage />} />
                  <Route path="/onboarding" element={<OnboardingPage />} />
                </Routes>
              </RunnerLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}

export default App

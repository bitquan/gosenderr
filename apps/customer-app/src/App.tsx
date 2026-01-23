import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'

// Layouts
import CustomerLayout from './layouts/CustomerLayout'

// Pages - will be copied from apps/web/src/app/customer
import DashboardPage from './pages/Dashboard'
import RequestDeliveryPage from './pages/RequestDelivery'
import JobsPage from './pages/Jobs'
import JobDetailPage from './pages/JobDetail'
import CheckoutPage from './pages/Checkout'

// Auth pages
import LoginPage from './pages/Login'
import SignupPage from './pages/Signup'

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
              <CustomerLayout>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/request-delivery" element={<RequestDeliveryPage />} />
                  <Route path="/jobs" element={<JobsPage />} />
                  <Route path="/jobs/:jobId" element={<JobDetailPage />} />
                  <Route path="/checkout" element={<CheckoutPage />} />
                </Routes>
              </CustomerLayout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}

export default App

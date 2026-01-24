import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { ErrorBoundary } from './components/ErrorBoundary'
import AdminSidebar from './components/AdminSidebar'

// Pages
import DashboardPage from './pages/Dashboard'
import LoginPage from './pages/Login'
import UsersPage from './pages/Users'
import JobsPage from './pages/Jobs'
import SettingsPage from './pages/Settings'
import AuditLogsPage from './pages/AuditLogs'
import FeatureFlagsPage from './pages/FeatureFlags'
import DisputesPage from './pages/Disputes'
import CourierApprovalPage from './pages/CourierApproval'
import RevenuePage from './pages/Revenue'

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
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <div className="flex min-h-screen bg-[#F8F9FF]">
                <AdminSidebar />
                <main className="flex-1 lg:ml-64">
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/jobs" element={<JobsPage />} />
                    <Route path="/disputes" element={<DisputesPage />} />
                    <Route path="/courier-approval" element={<CourierApprovalPage />} />
                    <Route path="/revenue" element={<RevenuePage />} />
                    <Route path="/audit-logs" element={<AuditLogsPage />} />
                    <Route path="/feature-flags" element={<FeatureFlagsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </main>
              </div>
            </ProtectedRoute>
          }
        />
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

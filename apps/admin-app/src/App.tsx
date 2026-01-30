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
import PaymentSettingsPage from './pages/PaymentSettings'
import EmailSettingsPage from './pages/EmailSettings'
import SecuritySettingsPage from './pages/SecuritySettings'
import AuditLogsPage from './pages/AuditLogs'
import FeatureFlagsPage from './pages/FeatureFlags'
import DisputesPage from './pages/Disputes'
import CourierApprovalPage from './pages/CourierApproval'
import RevenuePage from './pages/Revenue'
import MarketplacePage from './pages/Marketplace'
import MarketplaceOrdersPage from './pages/MarketplaceOrders'
import OrderDetailPage from './pages/OrderDetail'
import UserDetailPage from './pages/UserDetail'
import ItemDetailPage from './pages/ItemDetail'
import FlaggedContentPage from './pages/FlaggedContent'
import CategoriesPage from './pages/Categories'
import MessagingPage from './pages/Messaging'
import SystemCheckPage from './pages/SystemCheck'
import RateCardsComparison from './pages/RateCardsComparison'
import AdminFlowLogsPage from './pages/AdminFlowLogs'
import JobDetailPage from './pages/JobDetail'

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
                    <Route path="/users/:userId" element={<UserDetailPage />} />
                    <Route path="/jobs" element={<JobsPage />} />
                    <Route path="/rate-cards-comparison" element={<RateCardsComparison />} />
                    <Route path="/disputes" element={<DisputesPage />} />
                    <Route path="/courier-approval" element={<CourierApprovalPage />} />
                    <Route path="/revenue" element={<RevenuePage />} />
                    <Route path="/messaging" element={<MessagingPage />} />
                    <Route path="/marketplace" element={<MarketplacePage />} />
                    <Route path="/marketplace/:itemId" element={<ItemDetailPage />} />
                    <Route path="/flagged-content" element={<FlaggedContentPage />} />
                    <Route path="/marketplace-orders" element={<MarketplaceOrdersPage />} />
                    <Route path="/marketplace-orders/:orderId" element={<OrderDetailPage />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/system-check" element={<SystemCheckPage />} />
                    <Route path="/audit-logs" element={<AuditLogsPage />} />
                    <Route path="/feature-flags" element={<FeatureFlagsPage />} />
                    <Route path="/admin-flow-logs" element={<AdminFlowLogsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/settings/payment" element={<PaymentSettingsPage />} />
                    <Route path="/settings/email" element={<EmailSettingsPage />} />
                    <Route path="/settings/security" element={<SecuritySettingsPage />} />
                    <Route path="/jobs/:jobId" element={<JobDetailPage />} />
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

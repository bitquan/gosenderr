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
import SellerApprovalPage from './pages/SellerApproval'
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
import SecretsPage from './pages/Secrets'
import { useFeatureFlags } from './hooks/useFeatureFlags'
import { StripeModeBanner } from './components/StripeModeBanner'
import { ADMIN_PATHS } from './lib/navigation/adminNav'

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

function AdminWebAccessGate({ children }: { children: React.ReactNode }) {
  const { loading } = useFeatureFlags()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FF]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return <>{children}</>
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AdminWebAccessGate>
          <StripeModeBanner />
          <Routes>
          <Route path={ADMIN_PATHS.login} element={<LoginPage />} />
          
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="flex min-h-screen bg-[#F8F9FF]">
                  <AdminSidebar />
                  <main className="flex-1 lg:ml-64">
                    <Routes>
                      <Route path={ADMIN_PATHS.root} element={<Navigate to={ADMIN_PATHS.dashboard} replace />} />
                      <Route path={ADMIN_PATHS.dashboard} element={<DashboardPage />} />
                      <Route path={ADMIN_PATHS.users} element={<UsersPage />} />
                      <Route path={ADMIN_PATHS.userDetail} element={<UserDetailPage />} />
                      <Route path={ADMIN_PATHS.jobs} element={<JobsPage />} />
                      <Route path={ADMIN_PATHS.rateCardsComparison} element={<RateCardsComparison />} />
                      <Route path={ADMIN_PATHS.disputes} element={<DisputesPage />} />
                      <Route path={ADMIN_PATHS.courierApproval} element={<CourierApprovalPage />} />
                      <Route path={ADMIN_PATHS.sellerApproval} element={<SellerApprovalPage />} />
                      <Route path={ADMIN_PATHS.revenue} element={<RevenuePage />} />
                      <Route path={ADMIN_PATHS.messaging} element={<MessagingPage />} />
                      <Route path={ADMIN_PATHS.marketplace} element={<MarketplacePage />} />
                      <Route path={ADMIN_PATHS.marketplaceItemDetail} element={<ItemDetailPage />} />
                      <Route path={ADMIN_PATHS.flaggedContent} element={<FlaggedContentPage />} />
                      <Route path={ADMIN_PATHS.marketplaceOrders} element={<MarketplaceOrdersPage />} />
                      <Route path={ADMIN_PATHS.marketplaceOrderDetail} element={<OrderDetailPage />} />
                      <Route path={ADMIN_PATHS.categories} element={<CategoriesPage />} />
                      <Route path={ADMIN_PATHS.systemCheck} element={<SystemCheckPage />} />
                      <Route path={ADMIN_PATHS.auditLogs} element={<AuditLogsPage />} />
                      <Route path={ADMIN_PATHS.featureFlags} element={<FeatureFlagsPage />} />
                      <Route path={ADMIN_PATHS.adminFlowLogs} element={<AdminFlowLogsPage />} />
                      <Route path={ADMIN_PATHS.settings} element={<SettingsPage />} />
                      <Route path={ADMIN_PATHS.paymentSettings} element={<PaymentSettingsPage />} />
                      <Route path={ADMIN_PATHS.secrets} element={<SecretsPage />} />
                      <Route path={ADMIN_PATHS.emailSettings} element={<EmailSettingsPage />} />
                      <Route path={ADMIN_PATHS.securitySettings} element={<SecuritySettingsPage />} />
                    </Routes>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          </Routes>
        </AdminWebAccessGate>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

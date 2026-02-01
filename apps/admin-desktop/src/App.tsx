import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { ErrorBoundary } from './components/ErrorBoundary'
import AdminSidebar from './components/AdminSidebar'
import GlobalSearchModal from './components/GlobalSearchModal'
import PageHeader from './components/PageHeader'
import { ToastProvider } from './components/ToastProvider'

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
import SecretsPage from './pages/Secrets'

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
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isCmd = event.metaKey || event.ctrlKey
      if (isCmd && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
        return
      }

      if (isCmd && ['1', '2', '3', '4', '5'].includes(event.key)) {
        event.preventDefault()
        const map: Record<string, string> = {
          '1': '/dashboard',
          '2': '/users',
          '3': '/marketplace-orders',
          '4': '/jobs',
          '5': '/disputes'
        }
        navigate(map[event.key])
      }

      if (event.key === 'Escape') {
        setSearchOpen(false)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <div className="flex min-h-screen bg-[#F8F9FF]">
                  <AdminSidebar />
                  <main className="flex-1 lg:ml-64">
                    <PageHeader onOpenSearch={() => setSearchOpen(true)} />
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
                      <Route path="/settings/secrets" element={<SecretsPage />} />
                      <Route path="/settings/email" element={<EmailSettingsPage />} />
                      <Route path="/settings/security" element={<SecuritySettingsPage />} />
                    </Routes>
                  </main>
                </div>
              </ProtectedRoute>
            }
          />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App

import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { ErrorBoundary } from './components/ErrorBoundary'
import AdminSidebar from './components/AdminSidebar'
import GlobalSearchModal from './components/GlobalSearchModal'
import PageHeader from './components/PageHeader'
import { ToastProvider } from './components/ToastProvider'

// Pages (lazy-loaded)
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const LoginPage = lazy(() => import('./pages/Login'))
const UsersPage = lazy(() => import('./pages/Users'))
const JobsPage = lazy(() => import('./pages/Jobs'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const PaymentSettingsPage = lazy(() => import('./pages/PaymentSettings'))
const EmailSettingsPage = lazy(() => import('./pages/EmailSettings'))
const SecuritySettingsPage = lazy(() => import('./pages/SecuritySettings'))
const AuditLogsPage = lazy(() => import('./pages/AuditLogs'))
const FeatureFlagsPage = lazy(() => import('./pages/FeatureFlags'))
const DisputesPage = lazy(() => import('./pages/Disputes'))
const CourierApprovalPage = lazy(() => import('./pages/CourierApproval'))
const SellerApprovalPage = lazy(() => import('./pages/SellerApproval'))
const RevenuePage = lazy(() => import('./pages/Revenue'))
const MarketplacePage = lazy(() => import('./pages/Marketplace'))
const MarketplaceOrdersPage = lazy(() => import('./pages/MarketplaceOrders'))
const OrderDetailPage = lazy(() => import('./pages/OrderDetail'))
const UserDetailPage = lazy(() => import('./pages/UserDetail'))
const ItemDetailPage = lazy(() => import('./pages/ItemDetail'))
const FlaggedContentPage = lazy(() => import('./pages/FlaggedContent'))
const CategoriesPage = lazy(() => import('./pages/Categories'))
const MessagingPage = lazy(() => import('./pages/Messaging'))
const SystemCheckPage = lazy(() => import('./pages/SystemCheck'))
const RateCardsComparison = lazy(() => import('./pages/RateCardsComparison'))
const AdminFlowLogsPage = lazy(() => import('./pages/AdminFlowLogs'))
const SecretsPage = lazy(() => import('./pages/Secrets'))

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
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            }
          >
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
                          <Route path="/seller-approval" element={<SellerApprovalPage />} />
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
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  )
}

export default App

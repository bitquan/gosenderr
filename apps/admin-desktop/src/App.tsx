import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useState, lazy, Suspense } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { useFeatureFlags } from './hooks/useFeatureFlags'
import { ErrorBoundary } from './components/ErrorBoundary'
import AdminSidebar from './components/AdminSidebar'
import GlobalSearchModal from './components/GlobalSearchModal'
import PageHeader from './components/PageHeader'
import { ToastProvider } from './components/ToastProvider'
import { db } from './lib/firebase'
import { StripeModeBanner } from './components/StripeModeBanner'

// Pages (lazy-loaded)
const DashboardPage = lazy(() => import('./pages/Dashboard'))
const LoginPage = lazy(() => import('./pages/Login'))
const UsersPage = lazy(() => import('./pages/Users'))
const JobsPage = lazy(() => import('./pages/Jobs'))
const SettingsPage = lazy(() => import('./pages/Settings'))
const AuditLogsPage = lazy(() => import('./pages/AuditLogs'))
const FeatureFlagsPage = lazy(() => import('./pages/FeatureFlags'))
const DisputesPage = lazy(() => import('./pages/Disputes'))
const CourierApprovalPage = lazy(() => import('./pages/CourierApproval'))
const SellerApprovalPage = lazy(() => import('./pages/SellerApproval'))
const MarketplacePage = lazy(() => import('./pages/Marketplace'))
const MarketplaceOrdersPage = lazy(() => import('./pages/MarketplaceOrders'))
const OrderDetailPage = lazy(() => import('./pages/OrderDetail'))
const UserDetailPage = lazy(() => import('./pages/UserDetail'))
const ItemDetailPage = lazy(() => import('./pages/ItemDetail'))
const SystemLogsPage = lazy(() => import('./pages/SystemLogs'))
const FirebaseExplorerPage = lazy(() => import('./pages/FirebaseExplorer'))
const PaymentSettingsPage = lazy(() => import('./pages/PaymentSettings'))
const EmailSettingsPage = lazy(() => import('./pages/EmailSettings'))
const SecuritySettingsPage = lazy(() => import('./pages/SecuritySettings'))
const SecretsPage = lazy(() => import('./pages/Secrets'))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const [adminChecked, setAdminChecked] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let active = true

    const checkAdmin = async () => {
      if (!user) {
        if (active) {
          setIsAdmin(false)
          setAdminChecked(true)
        }
        return
      }

      try {
        const adminDoc = await getDoc(doc(db, 'adminProfiles', user.uid))
        if (active) {
          setIsAdmin(adminDoc.exists())
          setAdminChecked(true)
        }
      } catch (error) {
        console.error('Failed to verify admin profile:', error)
        if (active) {
          setIsAdmin(false)
          setAdminChecked(true)
        }
      }
    }

    checkAdmin()
    return () => {
      active = false
    }
  }, [user])
  
  if (loading || !adminChecked) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
    </div>
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FF]">
        <div className="max-w-md text-center bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin access required</h2>
          <p className="text-sm text-gray-600 mb-4">
            Your account does not have admin permissions. Contact a system administrator.
          </p>
        </div>
      </div>
    )
  }
  
  return <>{children}</>
}

function App() {
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)
  const { flags } = useFeatureFlags()

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
          <StripeModeBanner />
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
                          <Route path="/disputes" element={<DisputesPage />} />
                          <Route path="/courier-approval" element={<CourierApprovalPage />} />
                          <Route path="/seller-approval" element={<SellerApprovalPage />} />
                          <Route path="/marketplace" element={<MarketplacePage />} />
                          <Route path="/marketplace/:itemId" element={<ItemDetailPage />} />
                          <Route path="/marketplace-orders" element={<MarketplaceOrdersPage />} />
                          <Route path="/marketplace-orders/:orderId" element={<OrderDetailPage />} />
                          <Route path="/audit-logs" element={<AuditLogsPage />} />
                          <Route path="/feature-flags" element={<FeatureFlagsPage />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="/settings/payment" element={<PaymentSettingsPage />} />
                          <Route path="/settings/email" element={<EmailSettingsPage />} />
                          <Route path="/settings/security" element={<SecuritySettingsPage />} />
                          <Route path="/secrets" element={<SecretsPage />} />
                          <Route
                            path="/system-logs"
                            element={
                              flags?.admin?.systemLogs
                                ? <SystemLogsPage />
                                : <FeatureDisabled title="System Logs" />
                            }
                          />
                          <Route
                            path="/firebase-explorer"
                            element={
                              flags?.admin?.firebaseExplorer
                                ? <FirebaseExplorerPage />
                                : <FeatureDisabled title="Firebase Explorer" />
                            }
                          />
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

function FeatureDisabled({ title }: { title: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md text-center bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">{title} is disabled</h2>
        <p className="text-sm text-gray-600">
          Enable this feature in Feature Flags to access it.
        </p>
      </div>
    </div>
  )
}

export default App

import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import { ErrorBoundary } from './components/ErrorBoundary'

// Layouts
import CustomerLayout from './layouts/CustomerLayout'

// Pages
import DashboardPage from './pages/dashboard/page'
import RequestDeliveryPage from './pages/request-delivery/page'
import JobsPage from './pages/jobs/page'
import JobDetailPage from './pages/jobs/[jobId]/page'
import CheckoutPage from './pages/checkout/page'
import SettingsPage from './pages/settings/page'
import ProfilePage from './pages/profile/page'
import OrdersPage from './pages/orders/page'
import PackagesPage from './pages/packages/page'
import PackageDetailPage from './pages/packages/[packageId]/page'
import NewPackagePage from './pages/packages/new/page'
import NewJobPage from './pages/jobs/new/page'
import AddressesPage from './pages/addresses/page'
import PaymentMethodsPage from './pages/payment-methods/page'
import PaymentPage from './pages/payment/page'
import DisputesPage from './pages/disputes/page'
import FavoriteCouriersPage from './pages/favorite-couriers/page'
import NotificationsPage from './pages/notifications/page'
import PromoCodesPage from './pages/promo-codes/page'
import ReviewsPage from './pages/reviews/page'
import ScheduledDeliveriesPage from './pages/scheduled-deliveries/page'
import ShipPage from './pages/ship/page'
import SupportPage from './pages/support/page'
import MarketplacePage from './pages/marketplace/page'
import MarketplaceItemPage from './pages/marketplace/[itemId]/page'

// Vendor pages
import VendorApplicationPage from './pages/vendor/apply/page'
import VendorDashboard from './pages/vendor/dashboard/page'
import NewVendorItem from './pages/vendor/items/new/page'

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
  console.log('App component rendering')
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          
          <Route element={<ProtectedRoute><CustomerLayout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/request-delivery" element={<RequestDeliveryPage />} />
            <Route path="/ship" element={<ShipPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/marketplace/:itemId" element={<MarketplaceItemPage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/new" element={<NewJobPage />} />
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/packages" element={<PackagesPage />} />
            <Route path="/packages/new" element={<NewPackagePage />} />
            <Route path="/packages/:packageId" element={<PackageDetailPage />} />
            <Route path="/addresses" element={<AddressesPage />} />
            <Route path="/payment-methods" element={<PaymentMethodsPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/disputes" element={<DisputesPage />} />
            <Route path="/favorite-couriers" element={<FavoriteCouriersPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/promo-codes" element={<PromoCodesPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/scheduled-deliveries" element={<ScheduledDeliveriesPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            
            {/* Vendor Routes */}
            <Route path="/vendor/apply" element={<VendorApplicationPage />} />
            <Route path="/vendor/dashboard" element={<VendorDashboard />} />
            <Route path="/vendor/items/new" element={<NewVendorItem />} />
          </Route>
        </Routes>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

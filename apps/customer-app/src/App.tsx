import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { CartProvider } from './contexts/CartContext'
import { CartSidebar } from './components/cart/CartSidebar'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { RoleGuard } from './components/auth/RoleGuard'
import { PublicOnlyRoute } from './components/auth/RoleGuard'

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
import MarketplaceHome from './pages/marketplace/MarketplaceHome'
import MarketplaceItemPage from './pages/marketplace/[itemId]/page'
import MarketplaceCheckoutPage from './pages/marketplace/checkout/page'

// Vendor pages
import VendorApplicationPage from './pages/vendor/apply/page'
import VendorDashboard from './pages/vendor/dashboard/page'
import NewVendorItem from './pages/vendor/items/new/page'
import EditVendorItem from './pages/vendor/items/[itemId]/edit/page'

// Auth pages
import LoginPage from './pages/Login'
import SignupPage from './pages/Signup'

function App() {
  console.log('App component rendering')
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <CartSidebar />
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          } />
          <Route path="/signup" element={
            <PublicOnlyRoute>
              <SignupPage />
            </PublicOnlyRoute>
          } />
          
          {/* Public marketplace route */}
          <Route path="/" element={<CustomerLayout />}>
            <Route index element={<MarketplaceHome />} />
            <Route path="/marketplace" element={<MarketplaceHome />} />
            <Route path="/marketplace/:itemId" element={<MarketplaceItemPage />} />
            <Route path="/marketplace/checkout" element={<MarketplaceCheckoutPage />} />
          </Route>
          
          {/* Protected customer routes */}
          <Route element={<ProtectedRoute><CustomerLayout /></ProtectedRoute>}>
            
            {/* Customer &llowedRoles={['customer', 'vendor', 'buyer', 'seller']}>
                <DashboardPage />
              </RoleGuard>
            } />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/marketplace/:itemId" element={<MarketplaceItemPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/addresses" element={<AddressesPage />} />
            <Route path="/payment-methods" element={<PaymentMethodsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/reviews" element={<ReviewsPage />} />
            <Route path="/support" element={<SupportPage />} />
            
            {/* Customer-only routes */}
            <Route path="/request-delivery" element={
              <RoleGuard allowedRoles={['customer', 'buyer']}>
                <RequestDeliveryPage />
              </RoleGuard>
            } />
            <Route path="/ship" element={
              <RoleGuard allowedRoles={['customer', 'buyer']}>
                <ShipPage />
              </RoleGuard>
            } />
            <Route path="/jobs" element={
              <RoleGuard allowedRoles={['customer', 'buyer']}>
                <JobsPage />
              </RoleGuard>
            } />
            <Route path="/jobs/new" element={
              <RoleGuard allowedRoles={['customer', 'buyer']}>
                <NewJobPage />
              </RoleGuard>
            } />
            <Route path="/jobs/:jobId" element={
              <RoleGuard allowedRoles={['customer', 'buyer']}>
                <JobDetailPage />
              </RoleGuard>
            } />
            <Route path="/packages" element={
              <RoleGuard allowedRoles={['customer', 'buyer']}>
                <PackagesPage />
              </RoleGuard>
            } />
            <Route path="/packages/new" element={
              <RoleGuard allowedRoles={['customer', 'buyer']}>
                <NewPackagePage />
              </RoleGuard>
            } />
            <Route path="/packages/:packageId" element={
              <RoleGuard allowedRoles={['customer', 'buyer']}>
                <PackageDetailPage />
              </RoleGuard>
            } />
            <Route path="/payment" element={
              <RoleGuard allowedRoles={['customer', 'buyer']}>
                <PaymentPage />
              </RoleGuard>
            } />
            <Route path="/disputes" element={
              <RoleGuard allowedRoles={['customer', 'buyer']}>
                <DisputesPage />
              </RoleGuard>
            } />
            <Route path="/favorite-couriers" element={
              <RoleGuard allowedRoles={['customer', 'buyer']}>
                <FavoriteCouriersPage />
              </RoleGuard>
            } />
            <Route path="/promo-codes" element={
              <RoleGuard allowedRoles={['customer', 'buyer']}>
                <PromoCodesPage />
              </RoleGuard>
            } />
            <Route path="/scheduled-deliveries" element={
              <RoleGuard allowedRoles={['customer', 'buyer']}>
                <ScheduledDeliveriesPage />
              </RoleGuard>
            } />
            
            {/* Vendor Routes */}
            <Route path="/vendor/apply" element={
              <RoleGuard allowedRoles={['customer', 'buyer', 'vendor', 'seller']}>
                <VendorApplicationPage />
              </RoleGuard>
            } />
            <Route path="/vendor/dashboard" element={
              <RoleGuard allowedRoles={['vendor', 'seller']}>
                <VendorDashboard />
              </RoleGuard>
            } />
            <Route path="/vendor/items/new" element={
              <RoleGuard allowedRoles={['vendor', 'seller']}>
                <NewVendorItem />
              </RoleGuard>
            } />
            <Route path="/vendor/items/:itemId/edit" element={
              <RoleGuard allowedRoles={['vendor', 'seller']}>
                <EditVendorItem />
              </RoleGuard>
            } />
          </Route>
        </Routes>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

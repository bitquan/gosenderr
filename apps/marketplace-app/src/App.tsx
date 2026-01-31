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
import MarketplaceSellPage from './pages/marketplace/sell/page'
import MyListingsPage from './pages/profile/listings/page'
import SellerSettingsPage from './pages/profile/seller-settings/page'
import StripeOnboardingPage from './pages/profile/stripe-onboarding/page'
import OrderDetailPage from './pages/orders/[orderId]/page'
import MessagesPage from './pages/messages/page'
import ConversationPage from './pages/messages/[conversationId]/page'
import { useFeatureFlags } from './hooks/useFeatureFlags'

// Seller pages
import SellerApplicationPage from './pages/seller/apply/page'
import SellerDashboard from './pages/seller/dashboard/page'
import NewSellerItem from './pages/seller/items/new/page'
import EditSellerItem from './pages/seller/items/[itemId]/edit/page'
import SellerOrders from './pages/seller/orders/page'
import SellerReviews from './pages/seller/reviews/page'

// Auth pages
import LoginPage from './pages/Login'
import SignupPage from './pages/Signup'

function App() {
  console.log('App component rendering')
  const { flags, loading: flagsLoading } = useFeatureFlags()
  const marketplaceEnabled = flags?.marketplace?.enabled ?? true
  const messagingEnabled = (flags?.marketplace?.enabled && (flags as any)?.marketplace?.messaging) ?? true
  const ratingsEnabled = (flags?.marketplace?.enabled && (flags as any)?.marketplace?.ratings) ?? true

  const MarketplaceDisabled = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Marketplace Disabled</h1>
        <p className="text-gray-600">This feature is temporarily unavailable.</p>
      </div>
    </div>
  )

  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <CartSidebar />
          {flagsLoading ? (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-gray-600">Loading...</div>
            </div>
          ) : (
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
            <Route index element={marketplaceEnabled ? <MarketplaceHome /> : <MarketplaceDisabled />} />
            <Route path="/marketplace" element={marketplaceEnabled ? <MarketplaceHome /> : <MarketplaceDisabled />} />
            <Route path="/marketplace/:itemId" element={marketplaceEnabled ? <MarketplaceItemPage /> : <MarketplaceDisabled />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          
          {/* Protected marketplace sell route */}
          <Route element={<ProtectedRoute><CustomerLayout /></ProtectedRoute>}>
            <Route path="/sell" element={<Navigate to="/marketplace/sell" replace />} />
            <Route path="/marketplace/sell" element={marketplaceEnabled ? <MarketplaceSellPage /> : <MarketplaceDisabled />} />
            <Route path="/profile/listings" element={<MyListingsPage />} />
            <Route path="/profile/seller-settings" element={<SellerSettingsPage />} />
            <Route path="/profile/stripe-onboarding" element={<StripeOnboardingPage />} />
          </Route>
          
          {/* Protected customer routes */}
          <Route element={<ProtectedRoute><CustomerLayout /></ProtectedRoute>}>
            
            {/* Redirect /dashboard to /marketplace */}
            <Route path="/dashboard" element={<Navigate to="/marketplace" replace />} />

            {/* Customer dashboard */}
            <Route path="/dashboard" element={
              <RoleGuard allowedRoles={["customer", "buyer", "seller"]}>
                <DashboardPage />
              </RoleGuard>
            } />

            <Route path="/marketplace" element={marketplaceEnabled ? <MarketplaceHome /> : <MarketplaceDisabled />} />
            <Route path="/marketplace/:itemId" element={marketplaceEnabled ? <MarketplaceItemPage /> : <MarketplaceDisabled />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/addresses" element={<AddressesPage />} />
            <Route path="/payment-methods" element={<PaymentMethodsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/reviews" element={ratingsEnabled ? <ReviewsPage /> : <MarketplaceDisabled />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/messages" element={
              <RoleGuard allowedRoles={['customer', 'buyer', 'seller']}>
                {messagingEnabled ? <MessagesPage /> : <MarketplaceDisabled />}
              </RoleGuard>
            } />
            <Route path="/messages/:conversationId" element={
              <RoleGuard allowedRoles={['customer', 'buyer', 'seller']}>
                {messagingEnabled ? <ConversationPage /> : <MarketplaceDisabled />}
              </RoleGuard>
            } />
            
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
            
            {/* Seller Routes */}
            <Route path="/seller/apply" element={
              <RoleGuard allowedRoles={['customer', 'buyer', 'seller']}>
                <SellerApplicationPage />
              </RoleGuard>
            } />
            <Route path="/seller/dashboard" element={
              <RoleGuard allowedRoles={['admin', 'seller']}>
                <SellerDashboard />
              </RoleGuard>
            } />
            <Route path="/seller/items/new" element={
              <RoleGuard allowedRoles={['admin', 'seller']}>
                <NewSellerItem />
              </RoleGuard>
            } />
            <Route path="/seller/items/:itemId/edit" element={
              <RoleGuard allowedRoles={['admin', 'seller']}>
                <EditSellerItem />
              </RoleGuard>
            } />
            <Route path="/seller/orders" element={
              <RoleGuard allowedRoles={['admin', 'seller']}>
                <SellerOrders />
              </RoleGuard>
            } />
            <Route path="/seller/reviews" element={
              <RoleGuard allowedRoles={['admin', 'seller']}>
                {ratingsEnabled ? <SellerReviews /> : <MarketplaceDisabled />}
              </RoleGuard>
            } />
          </Route>
        </Routes>
          )}
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

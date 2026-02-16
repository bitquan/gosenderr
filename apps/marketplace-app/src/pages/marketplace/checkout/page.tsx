import { Navigate } from 'react-router-dom';

export default function MarketplaceCheckoutPage() {
  return <Navigate to="/checkout?mode=cart" replace />;
}

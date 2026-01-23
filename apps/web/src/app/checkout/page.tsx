import { Suspense } from "react";
import CheckoutClient from "./CheckoutClient";

export default function MarketplaceCheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading checkout...</div>
        </div>
      }
    >
      <CheckoutClient />
    </Suspense>
  );
}

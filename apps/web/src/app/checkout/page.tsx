"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getItem, Item } from "@/lib/v2/items";
import { AddressAutocomplete } from "@/components/v2/AddressAutocomplete";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { calcMiles } from "@/lib/v2/pricing";

interface SellerProfile {
  stripeConnectAccountId?: string;
  email?: string;
}

export default function MarketplaceCheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get("itemId");
  const { user } = useAuthUser();
  const { flags } = useFeatureFlags();

  const [item, setItem] = useState<Item | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dropoffAddress, setDropoffAddress] = useState<any>(null);
  const [distance, setDistance] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (!itemId) {
      router.push("/marketplace");
      return;
    }

    async function loadItem() {
      try {
        const data = await getItem(itemId);
        if (!data) {
          router.push("/marketplace");
          return;
        }
        setItem(data);

        const sellerRef = doc(db, "users", data.sellerId);
        const sellerSnap = await getDoc(sellerRef);
        if (sellerSnap.exists()) {
          setSeller(sellerSnap.data() as SellerProfile);
        }
      } catch (err) {
        console.error("Failed to load item:", err);
        setError("Failed to load item details.");
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [itemId, router]);

  useEffect(() => {
    if (!dropoffAddress || !item?.pickupLocation) return;
    const miles = calcMiles(
      item.pickupLocation.lat,
      item.pickupLocation.lng,
      dropoffAddress.lat,
      dropoffAddress.lng,
    );
    setDistance(miles);
  }, [dropoffAddress, item]);

  const deliveryFee = useMemo(() => {
    const fee = 5 + distance * 1.25;
    return Math.max(8, Number(fee.toFixed(2)));
  }, [distance]);

  const platformFee = 2.5;
  const total = useMemo(() => {
    if (!item) return 0;
    return Number((item.price + deliveryFee + platformFee).toFixed(2));
  }, [item, deliveryFee]);

  const handleCheckout = async () => {
    if (!item || !seller?.stripeConnectAccountId || !dropoffAddress) return;
    setCheckingOut(true);
    setError(null);

    try {
      const orderRef = await addDoc(collection(db, "marketplaceOrders"), {
        itemId: item.id,
        itemTitle: item.title,
        sellerId: item.sellerId,
        buyerId: user?.uid || null,
        buyerEmail: user?.email || null,
        dropoffAddress,
        deliveryFee,
        platformFee,
        itemPrice: item.price,
        total,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const origin = window.location.origin;
      const response = await fetch("/api/stripe/marketplace-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemTitle: item.title,
          itemPrice: item.price,
          deliveryFee,
          platformFee,
          sellerStripeAccountId: seller.stripeConnectAccountId,
          successUrl: `${origin}/marketplace?checkout=success&order=${orderRef.id}`,
          cancelUrl: `${origin}/checkout?itemId=${item.id}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      await updateDoc(orderRef, {
        checkoutSessionId: data.sessionId,
        updatedAt: serverTimestamp(),
      });

      window.location.href = data.url;
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  if (!flags?.marketplace?.combinedPayments) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <Card variant="elevated" className="max-w-md">
          <CardContent>
            <h2 className="text-lg font-semibold">Checkout Disabled</h2>
            <p className="text-sm text-gray-600 mt-2">
              Combined marketplace checkout is currently disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading checkout...</div>
      </div>
    );
  }

  if (!item) return null;

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Checkout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-gray-900">{item.title}</p>
              <p className="text-sm text-gray-600">
                Item price: ${item.price.toFixed(2)}
              </p>
            </div>
            <div className="mt-4">
              <AddressAutocomplete
                label="Delivery Address"
                placeholder="Enter dropoff address"
                onSelect={(result) => setDropoffAddress(result)}
                required
              />
            </div>
            {dropoffAddress && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white/80 rounded-xl p-3">
                  <p className="text-gray-500">Distance</p>
                  <p className="font-semibold">{distance.toFixed(1)} miles</p>
                </div>
                <div className="bg-white/80 rounded-xl p-3">
                  <p className="text-gray-500">Delivery Fee</p>
                  <p className="font-semibold">${deliveryFee.toFixed(2)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Item</span>
                <span className="font-semibold">${item.price.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Delivery</span>
                <span className="font-semibold">${deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Platform fee</span>
                <span className="font-semibold">${platformFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-purple-600">${total.toFixed(2)}</span>
              </div>
            </div>

            {!seller?.stripeConnectAccountId && (
              <div className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
                Seller has not completed Stripe Connect onboarding yet.
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={
                !dropoffAddress ||
                !seller?.stripeConnectAccountId ||
                checkingOut
              }
              className="mt-6 w-full rounded-xl bg-purple-600 text-white py-3 font-semibold hover:bg-purple-700 transition disabled:opacity-60"
            >
              {checkingOut ? "Redirecting..." : "Pay with Stripe"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

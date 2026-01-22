"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface SellerProfile {
  stripeConnectAccountId?: string;
}

export default function VendorStripeOnboardingPage() {
  const router = useRouter();
  const { flags } = useFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      router.push("/login");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      setUserId(user.uid);
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as SellerProfile);
        }
      } catch (err: any) {
        console.error("Failed to load seller profile:", err);
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleConnect = async () => {
    if (!userId) return;
    setConnecting(true);
    setError(null);

    try {
      const origin = window.location.origin;
      const response = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: profile?.stripeConnectAccountId || null,
          refreshUrl: `${origin}/vendor/onboarding/stripe`,
          returnUrl: `${origin}/vendor/onboarding/stripe?success=1`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to start Stripe onboarding");
      }

      if (!profile?.stripeConnectAccountId) {
        await updateDoc(doc(db, "users", userId), {
          stripeConnectAccountId: data.accountId,
          updatedAt: serverTimestamp(),
        });
        setProfile({ stripeConnectAccountId: data.accountId });
      }

      window.location.href = data.url;
    } catch (err: any) {
      console.error("Stripe connect error:", err);
      setError(err.message || "Stripe onboarding failed");
    } finally {
      setConnecting(false);
    }
  };

  if (!flags?.seller?.stripeConnect) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <Card variant="elevated" className="max-w-md">
          <CardContent>
            <h2 className="text-lg font-semibold">Stripe Connect Disabled</h2>
            <p className="text-sm text-gray-600 mt-2">
              Stripe Connect is currently disabled. Please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Stripe Connect Onboarding</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm mb-4">
              Connect your Stripe account to receive payouts for marketplace
              sales.
            </p>
            {profile?.stripeConnectAccountId ? (
              <div className="rounded-2xl bg-purple-50 p-4 text-sm text-purple-700">
                Stripe account connected. You can continue onboarding or update
                your details.
              </div>
            ) : (
              <div className="rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-800">
                No Stripe account connected yet.
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={connecting}
              className="mt-6 w-full rounded-xl bg-purple-600 text-white py-3 font-semibold hover:bg-purple-700 transition disabled:opacity-60"
            >
              {connecting ? "Connecting..." : "Connect with Stripe"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

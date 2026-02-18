import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createStripeConnectLink } from "@/lib/cloudFunctions";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAuthSafe } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface CourierProfile {
  stripeConnectAccountId?: string;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeRequirementsDue?: string[];
  stripeRequirementsPastDue?: string[];
  stripeAccountStatus?: string;
  status?: string;
}

export default function CourierStripeOnboardingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courierProfile, setCourierProfile] = useState<CourierProfile | null>(
    null,
  );
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      navigate("/login");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      setUserId(user.uid);
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setCourierProfile(userData.courierProfile || {});
        }
      } catch (err: unknown) {
        console.error("Failed to load courier profile:", err);
        const message = err instanceof Error ? err.message : String(err);
        setError(message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleConnect = async () => {
    if (!userId) return;
    setConnecting(true);
    setError(null);

    try {
      const origin = window.location.origin;
      const data = await createStripeConnectLink({
        accountId: courierProfile?.stripeConnectAccountId || null,
        refreshUrl: `${origin}/onboarding/stripe`,
        returnUrl: `${origin}/onboarding/stripe?success=1`,
      });

      // Save Stripe account ID to courierProfile
      if (!courierProfile?.stripeConnectAccountId) {
        await updateDoc(doc(db, "users", userId), {
          "courierProfile.stripeConnectAccountId": data.accountId,
          "courierProfile.stripeAccountId": data.accountId,
          updatedAt: serverTimestamp(),
        });
        setCourierProfile({
          ...courierProfile,
          stripeConnectAccountId: data.accountId,
        });
      }

      window.location.href = data.url;
    } catch (err: unknown) {
      console.error("Stripe connect error:", err);
      const message = err instanceof Error ? err.message : String(err);
      setError(message || "Stripe onboarding failed");
    } finally {
      setConnecting(false);
    }
  };

  const handleSkipForNow = () => {
    navigate("/dashboard");
  };

  const handleGoToDashboard = () => {
    navigate("/dashboard");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  const hasStripeAccount = !!courierProfile?.stripeConnectAccountId;
  const chargesEnabled = Boolean(courierProfile?.stripeChargesEnabled);
  const payoutsEnabled = Boolean(courierProfile?.stripePayoutsEnabled);
  const requirementsDue = courierProfile?.stripeRequirementsDue || [];
  const requirementsPastDue = courierProfile?.stripeRequirementsPastDue || [];
  const isVerified = chargesEnabled && payoutsEnabled;

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>💰 Get Paid with Stripe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Connect your Stripe account to receive automatic payouts after
                completing deliveries.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h3 className="font-semibold text-blue-900 mb-2">
                  ✨ Benefits:
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Instant payouts after delivery completion</li>
                  <li>• Secure payments via Stripe</li>
                  <li>• Track all your earnings in one place</li>
                  <li>• Direct deposit to your bank account</li>
                </ul>
              </div>

              {hasStripeAccount ? (
                <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700 space-y-2">
                  <div>
                    {isVerified
                      ? "✅ Stripe account connected! You're all set to receive payments."
                      : "⚠️ Stripe account connected, but onboarding is incomplete."}
                  </div>
                  <div className="text-xs text-green-700">
                    Charges: {chargesEnabled ? "Enabled" : "Disabled"} •
                    Payouts: {payoutsEnabled ? "Enabled" : "Disabled"}
                  </div>
                  {(requirementsDue.length > 0 ||
                    requirementsPastDue.length > 0) && (
                    <div className="text-xs text-green-700">
                      Requirements due: {requirementsDue.length} • Past due:{" "}
                      {requirementsPastDue.length}
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-800">
                  ⚠️ No Stripe account connected. Connect now to start earning!
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                  ❌ {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="flex-1 rounded-xl bg-purple-600 text-white py-3 font-semibold hover:bg-purple-700 transition disabled:opacity-60"
                >
                  {connecting
                    ? "Connecting..."
                    : hasStripeAccount
                    ? "Update Stripe Account"
                    : "Connect with Stripe"}
                </button>

                {!hasStripeAccount && (
                  <button
                    onClick={handleSkipForNow}
                    className="px-6 rounded-xl bg-gray-200 text-gray-700 py-3 font-semibold hover:bg-gray-300 transition"
                  >
                    Skip for Now
                  </button>
                )}
              </div>

              {hasStripeAccount && (
                <button
                  onClick={handleGoToDashboard}
                  className="w-full rounded-xl bg-gray-100 text-gray-700 py-3 font-semibold hover:bg-gray-200 transition"
                >
                  Go to Dashboard
                </button>
              )}

              <p className="text-xs text-gray-500 mt-4">
                By connecting with Stripe, you agree to Stripe's terms of
                service. Payouts are typically processed within 2 business days
                after delivery completion.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

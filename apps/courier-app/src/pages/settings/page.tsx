
import { LoadingState } from "@gosenderr/ui";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Link } from "react-router-dom";
import { getAuthSafe } from "@/lib/firebase/auth";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function CourierSettingsPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const [courierData, setCourierData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (user) {
      const loadCourierData = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setCourierData(userDoc.data());
          }
        } finally {
          setDataLoading(false);
        }
      };

      loadCourierData();
    } else {
      setDataLoading(false);
    }
  }, [user]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const auth = getAuthSafe();
      if (auth) {
        await auth.signOut();
        navigate("/login");
      }
    } catch (error) {
      console.error("Error signing out:", error);
      setSigningOut(false);
    }
  };

  if (loading || dataLoading) {
    return <LoadingState fullPage message="Loading settings..." />;
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-y-auto pb-24 safe-top bg-[#F8F9FF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              ⚙️ Settings & Preferences
            </h1>
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              👤 Account
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-600 font-medium mb-1">Email</p>
                  <p className="text-lg font-semibold text-gray-900 break-all">
                    {user.email || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-600 font-medium mb-1">Account Type</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {courierData?.role === 'courier' ? '📦 Courier' : '⚙️ Admin'}
                  </p>
                </div>
              </div>
              {courierData?.courierProfile && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-xs text-blue-600 font-medium mb-1">Status</p>
                    <p className="text-lg font-bold text-blue-900">
                      {courierData.courierProfile.isOnline ? '🟢 Online' : '⚪ Offline'}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <p className="text-xs text-emerald-600 font-medium mb-1">Completed Deliveries</p>
                    <p className="text-lg font-bold text-emerald-900">
                      {courierData.courierProfile.completedJobs || 0}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-xs text-purple-600 font-medium mb-1">Today's Deliveries</p>
                    <p className="text-lg font-bold text-purple-900">
                      {courierData.courierProfile.todayJobs || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delivery Settings Section */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🚚 Delivery Settings
            </h2>
            <div className="space-y-3">
              <Link
                to="/rate-cards"
                className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 px-6 py-4 font-semibold text-gray-900 hover:border-blue-300 hover:from-blue-100 hover:to-indigo-100 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <div className="text-left">
                    <p className="font-bold">Rate Cards & Pricing</p>
                    <p className="text-xs text-gray-600">Set your delivery rates</p>
                  </div>
                </div>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>

              <Link
                to="/equipment"
                className="flex items-center justify-between rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 px-6 py-4 font-semibold text-gray-900 hover:border-purple-300 hover:from-purple-100 hover:to-pink-100 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎒</span>
                  <div className="text-left">
                    <p className="font-bold">Equipment & Vehicle</p>
                    <p className="text-xs text-gray-600">Manage your delivery equipment</p>
                  </div>
                </div>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Payments Section */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              💳 Payments
            </h2>
            <div className="space-y-3">
              <Link
                to="/earnings"
                className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 px-6 py-4 font-semibold text-gray-900 hover:border-emerald-300 hover:from-emerald-100 hover:to-green-100 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💵</span>
                  <div className="text-left">
                    <p className="font-bold">Earnings & Payouts</p>
                    <p className="text-xs text-gray-600">View your earnings history</p>
                  </div>
                </div>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>

              <Link
                to="/onboarding/stripe"
                className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 px-6 py-4 font-semibold text-gray-900 hover:border-blue-300 hover:from-blue-100 hover:to-cyan-100 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏦</span>
                  <div className="text-left">
                    <p className="font-bold">Stripe Connect Setup</p>
                    <p className="text-xs text-gray-600">Connect your bank account</p>
                  </div>
                </div>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              ❓ Help & Support
            </h2>
            <Link
              to="/support"
              className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 px-6 py-4 font-semibold text-gray-900 hover:border-amber-300 hover:from-amber-100 hover:to-orange-100 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <div className="text-left">
                  <p className="font-bold">Contact Support</p>
                  <p className="text-xs text-gray-600">Get help with your account</p>
                </div>
              </div>
              <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border-2 border-red-200 overflow-hidden">
          <div className="p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-red-900 mb-6">
              🚪 Danger Zone
            </h2>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-red-500 text-white px-6 py-4 font-bold text-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
            >
              <span className="text-2xl">🚪</span>
              <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
            <p className="text-xs text-gray-500 mt-3 text-center">
              You'll be logged out and returned to the login screen
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

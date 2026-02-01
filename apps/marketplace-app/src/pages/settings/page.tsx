
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";

export default function CustomerSettingsPage() {
  const navigate = useNavigate();
  const { user, loading, uid } = useAuthUser();
  const [sellerStatus, setSellerStatus] = useState<"none" | "pending" | "approved">("none");

  const handleSignOut = async () => {
    try {
      const auth = getAuthSafe();
      if (auth) {
        await auth.signOut();
        navigate("/login");
      }
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  useEffect(() => {
    if (!uid) return;
    
    const checkSellerStatus = async () => {
      const userDoc = await getDoc(doc(db, `users/${uid}`));
      const userData = userDoc.data();
      
      if (userData?.isSeller === true || userData?.sellerApplication?.status === "approved") {
        setSellerStatus("approved");
      } else if (userData?.sellerApplication?.status === "pending") {
        setSellerStatus("pending");
      }
    };
    
    checkSellerStatus();
  }, [uid]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Customer Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                to="/addresses"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📍</span>
                  <span>Saved Addresses</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                to="/profile"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">👤</span>
                  <span>Profile Settings</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                to="/notifications"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔔</span>
                  <span>Notification Preferences</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                to="/payment-methods"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">💳</span>
                  <span>Payment Methods</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                to="/packages"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📦</span>
                  <span>Package History</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                to="/support"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">💬</span>
                  <span>Help & Support</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
              
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-between rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🚪</span>
                  <span>Sign Out</span>
                </div>
                <span className="text-red-400">→</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Seller Section */}
        {sellerStatus === "none" && (
          <Card variant="elevated" className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="text-5xl">🏪</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Become a Seller
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Sell your products on our marketplace and reach thousands of customers. 
                    Easy setup, secure payments, and 24/7 support.
                  </p>
                  <Link
                    to="/seller/apply"
                    className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg transition-all"
                  >
                    Apply Now
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {sellerStatus === "pending" && (
          <Card variant="elevated" className="border-2 border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="text-5xl">⏳</div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Seller Application Pending
                  </h3>
                  <p className="text-gray-600">
                    We're reviewing your application. You'll receive an email within 24 hours.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

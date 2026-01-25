
import { LoadingState } from "@gosenderr/ui";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getAuthSafe } from "@/lib/firebase/auth";

export default function CourierSettingsPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();

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

  if (loading) {
    return <LoadingState fullPage message="Loading settings..." />;
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-y-auto pb-24 safe-top bg-[#F8F9FF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-4 sm:space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Courier Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                to="/rate-cards"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Rate Cards & Pricing
                <span>→</span>
              </Link>
              <Link
                to="/equipment"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Equipment
                <span>→</span>
              </Link>
              <Link
                to="/onboarding/stripe"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Stripe Connect Setup
                <span>→</span>
              </Link>
              <Link
                to="/support"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Support
                <span>→</span>
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
      </div>
    </div>
  );
}

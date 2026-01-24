
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { getAuthSafe } from "@/lib/firebase/auth";

export default function RunnerSettingsPage() {
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
            <CardTitle>Shifter Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                to="/runner/profile"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Profile
                <span>→</span>
              </Link>
              <Link
                to="/runner/earnings"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Earnings
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

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { Card } from "../components/Card";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    const fetchUser = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
      setLoading(false);
    };

    fetchUser();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>

        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Account Settings
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => navigate("/profile")}
                className="w-full flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">👤</span>
                  <span>Profile Settings</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>

              <button
                onClick={() => alert("Notifications coming soon!")}
                className="w-full flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔔</span>
                  <span>Notification Preferences</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>

              <button
                onClick={() => alert("Payment methods coming soon!")}
                className="w-full flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">💳</span>
                  <span>Payment Methods</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>

              <button
                onClick={() => alert("Saved addresses coming soon!")}
                className="w-full flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📍</span>
                  <span>Saved Addresses</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Support
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => alert("Help center coming soon!")}
                className="w-full flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">❓</span>
                  <span>Help Center</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>

              <button
                onClick={() => alert("Contact support coming soon!")}
                className="w-full flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">💬</span>
                  <span>Contact Support</span>
                </div>
                <span className="text-gray-400">→</span>
              </button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <strong>Version:</strong> 1.0.0
              </p>
              <p>
                <strong>Email:</strong> {userData?.email || "N/A"}
              </p>
              <p>
                <strong>User ID:</strong> {user?.uid}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

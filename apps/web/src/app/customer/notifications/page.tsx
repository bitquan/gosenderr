"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface Preferences {
  deliveryUpdates: boolean;
  nearbyCourierAlerts: boolean;
  marketing: boolean;
}

export default function NotificationPreferencesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Preferences>({
    deliveryUpdates: true,
    nearbyCourierAlerts: true,
    marketing: false,
  });
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
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
      if ("Notification" in window) {
        setPermission(Notification.permission);
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const stored = userDoc.data()?.notificationPreferences;
        if (stored) {
          setPrefs({
            deliveryUpdates: stored.deliveryUpdates ?? true,
            nearbyCourierAlerts: stored.nearbyCourierAlerts ?? true,
            marketing: stored.marketing ?? false,
          });
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const requestPermission = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    await updateDoc(doc(db, "users", userId), {
      notificationPreferences: prefs,
      updatedAt: serverTimestamp(),
    });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">
          Loading preferences...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Delivery updates</p>
                  <p className="text-sm text-gray-500">
                    Status changes and ETA alerts
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.deliveryUpdates}
                  onChange={(e) =>
                    setPrefs((prev) => ({
                      ...prev,
                      deliveryUpdates: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 text-purple-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    Nearby courier alerts
                  </p>
                  <p className="text-sm text-gray-500">
                    Notify when courier is nearby
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.nearbyCourierAlerts}
                  onChange={(e) =>
                    setPrefs((prev) => ({
                      ...prev,
                      nearbyCourierAlerts: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 text-purple-600"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">Marketing updates</p>
                  <p className="text-sm text-gray-500">
                    Product news and offers
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={prefs.marketing}
                  onChange={(e) =>
                    setPrefs((prev) => ({
                      ...prev,
                      marketing: e.target.checked,
                    }))
                  }
                  className="w-5 h-5 text-purple-600"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={requestPermission}
                className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition"
              >
                {permission === "granted"
                  ? "Notifications enabled"
                  : "Enable notifications"}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Preferences"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

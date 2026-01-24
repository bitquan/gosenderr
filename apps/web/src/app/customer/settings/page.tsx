"use client";

import { useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function CustomerSettingsPage() {
  const router = useRouter();
  const { user, loading } = useAuthUser();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push("/login");
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
                href="/customer/addresses"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📍</span>
                  <span>Saved Addresses</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                href="/customer/profile"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">👤</span>
                  <span>Profile Settings</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                href="/customer/notifications"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔔</span>
                  <span>Notification Preferences</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                href="/customer/payment-methods"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">💳</span>
                  <span>Payment Methods</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                href="/customer/packages"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">📦</span>
                  <span>Package History</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
              <Link
                href="/customer/support"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">💬</span>
                  <span>Help & Support</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

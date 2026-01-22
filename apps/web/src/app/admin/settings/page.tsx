"use client";

import { useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function AdminSettingsPage() {
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
            <CardTitle>Admin Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                href="/admin/users"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                User Management
                <span>→</span>
              </Link>
              <Link
                href="/admin/feature-flags"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Feature Flags
                <span>→</span>
              </Link>
              <Link
                href="/admin/analytics"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Analytics
                <span>→</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

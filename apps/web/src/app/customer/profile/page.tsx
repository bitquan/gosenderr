"use client";

import { useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export default function CustomerProfilePage() {
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
      <div className="max-w-3xl mx-auto space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Customer Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-700">
              <div>
                <div className="text-xs text-gray-500">Name</div>
                <div className="font-semibold">{user.displayName || "—"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Email</div>
                <div className="font-semibold">{user.email || "—"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/customer/settings"
              className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Manage Settings
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

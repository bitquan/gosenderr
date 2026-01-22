"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { BottomNav, runnerNavItems } from "@/components/ui/BottomNav";

export default function RunnerProfilePage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

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

      setCurrentUser(user);
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } catch (err) {
        console.error("Error loading runner profile:", err);
      } finally {
        setLoading(false);
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-purple-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-purple-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  const profile = userProfile?.packageRunnerProfile;

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Avatar
              fallback={currentUser?.displayName || currentUser?.email}
              size="lg"
            />
            <div>
              <h1 className="text-2xl font-bold">Runner Profile</h1>
              <p className="text-purple-100 text-sm">{currentUser?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8 space-y-6">
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle>Status</CardTitle>
          </CardHeader>
          <CardContent>
            {profile?.status ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Application Status</p>
                  <p className="text-lg font-semibold">
                    {profile.status.replace("_", " ")}
                  </p>
                </div>
                <StatusBadge status={profile.status} />
              </div>
            ) : (
              <p className="text-gray-600">
                No runner profile found. Complete onboarding to continue.
              </p>
            )}
          </CardContent>
        </Card>

        {profile && (
          <>
            <Card variant="elevated" className="animate-fade-in">
              <CardHeader>
                <CardTitle>Vehicle</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Type</p>
                    <p className="font-semibold">
                      {profile.vehicleType || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Capacity</p>
                    <p className="font-semibold">
                      {profile.vehicleCapacity || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Max Weight</p>
                    <p className="font-semibold">{profile.maxWeight || "—"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="elevated" className="animate-fade-in">
              <CardHeader>
                <CardTitle>Home Hub</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  {profile.homeHub?.name || "No home hub assigned"}
                </p>
              </CardContent>
            </Card>

            <Card variant="elevated" className="animate-fade-in">
              <CardHeader>
                <CardTitle>Preferred Routes</CardTitle>
              </CardHeader>
              <CardContent>
                {Array.isArray(profile.preferredRoutes) &&
                profile.preferredRoutes.length > 0 ? (
                  <div className="space-y-2">
                    {profile.preferredRoutes.map(
                      (route: any, index: number) => (
                        <div key={index} className="p-3 rounded-xl bg-gray-50">
                          <p className="text-sm font-semibold">
                            {route.fromHubId} → {route.toHubId}
                          </p>
                          <p className="text-xs text-gray-600">
                            {route.frequency}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600">No preferred routes listed.</p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <BottomNav items={runnerNavItems} />
    </div>
  );
}

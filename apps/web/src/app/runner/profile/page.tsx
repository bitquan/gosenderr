"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";

export default function RunnerProfilePage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    vehicleType: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    licensePlate: "",
  });

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
          const data = userDoc.data();
          setUserProfile(data);
          setFormData({
            name: data.name || user.displayName || "",
            phone: data.phone || "",
            vehicleType: data.packageRunnerProfile?.vehicleType || "",
            vehicleMake: data.packageRunnerProfile?.vehicleMake || "",
            vehicleModel: data.packageRunnerProfile?.vehicleModel || "",
            vehicleYear: data.packageRunnerProfile?.vehicleYear || "",
            licensePlate: data.packageRunnerProfile?.licensePlate || "",
          });
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

  const handleSave = async () => {
    if (!currentUser) return;

    setSaving(true);
    try {
      // Update Firebase Auth profile
      await updateProfile(currentUser, {
        displayName: formData.name,
      });

      // Update Firestore user document
      await updateDoc(doc(db, "users", currentUser.uid), {
        name: formData.name,
        phone: formData.phone,
        "packageRunnerProfile.vehicleType": formData.vehicleType,
        "packageRunnerProfile.vehicleMake": formData.vehicleMake,
        "packageRunnerProfile.vehicleModel": formData.vehicleModel,
        "packageRunnerProfile.vehicleYear": formData.vehicleYear,
        "packageRunnerProfile.licensePlate": formData.licensePlate,
        updatedAt: serverTimestamp(),
      });

      // Refresh profile
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) {
        setUserProfile(userDoc.data());
      }

      setIsEditing(false);
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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
              <h1 className="text-2xl font-bold">Shifter Profile</h1>
              <p className="text-purple-100 text-sm">{currentUser?.email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8 space-y-6">
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Personal Information</CardTitle>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                ) : (
                  <p className="px-4 py-2 bg-gray-50 rounded-xl text-gray-900">
                    {formData.name || "Not set"}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <p className="px-4 py-2 bg-gray-50 rounded-xl text-gray-500">
                  {currentUser?.email}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Email cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="+1 (555) 123-4567"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                ) : (
                  <p className="px-4 py-2 bg-gray-50 rounded-xl text-gray-900">
                    {formData.phone || "Not set"}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <Link
              href="/runner/settings"
              className="inline-flex items-center justify-center rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
            >
              Manage Settings
            </Link>
          </CardContent>
        </Card>
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
                No shifter profile found. Complete onboarding to continue.
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
                    <label className="block text-xs text-gray-500 mb-1">
                      Type
                    </label>
                    {isEditing ? (
                      <select
                        value={formData.vehicleType}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vehicleType: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Select type</option>
                        <option value="car">Car</option>
                        <option value="van">Van</option>
                        <option value="truck">Truck</option>
                        <option value="bike">Bike</option>
                        <option value="scooter">Scooter</option>
                      </select>
                    ) : (
                      <p className="font-semibold">
                        {formData.vehicleType || "—"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Make
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.vehicleMake}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vehicleMake: e.target.value,
                          })
                        }
                        placeholder="Toyota"
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="font-semibold">
                        {formData.vehicleMake || "—"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Model
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.vehicleModel}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vehicleModel: e.target.value,
                          })
                        }
                        placeholder="Camry"
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="font-semibold">
                        {formData.vehicleModel || "—"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Year
                    </label>
                    {isEditing ? (
                      <input
                        type="number"
                        value={formData.vehicleYear}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            vehicleYear: e.target.value,
                          })
                        }
                        placeholder="2020"
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="font-semibold">
                        {formData.vehicleYear || "—"}
                      </p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">
                      License Plate
                    </label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={formData.licensePlate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            licensePlate: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="ABC-1234"
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
                      />
                    ) : (
                      <p className="font-semibold">
                        {formData.licensePlate || "—"}
                      </p>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                )}
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
    </div>
  );
}

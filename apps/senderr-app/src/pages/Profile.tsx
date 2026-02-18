import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useUserDoc } from "@/hooks/v2/useUserDoc";
import { db, getAuthSafe, storage } from "@/lib/firebase";
import { formatCurrency } from "@/lib/utils";

type VehicleType =
  | "foot"
  | "bike"
  | "scooter"
  | "motorcycle"
  | "car"
  | "van"
  | "truck";

type CourierProfileSnapshot = {
  isOnline?: boolean;
  vehicleType?: VehicleType | string;
  status?: string;
};

export default function CourierProfilePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, uid } = useAuthUser();
  const { userDoc, loading: userLoading } = useUserDoc();
  const courierProfile =
    (userDoc?.courierProfile as CourierProfileSnapshot | undefined) ?? null;
  const isAdmin = userDoc?.role === "admin";
  const isCourier =
    !isAdmin && (userDoc?.role === "courier" || Boolean(courierProfile));
  const [vehicleType, setVehicleType] = useState<VehicleType>("car");
  const [saving, setSaving] = useState(false);
  const [earnings, setEarnings] = useState({
    total: 0,
    completed: 0,
    thisMonth: 0,
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!courierProfile?.vehicleType) return;
    setVehicleType(courierProfile.vehicleType as VehicleType);
  }, [courierProfile?.vehicleType]);

  useEffect(() => {
    if (!uid) return;

    // Load earnings stats
    const loadEarnings = async () => {
      try {
        const q = query(
          collection(db, "jobs"),
          where("courierUid", "==", uid),
          where("status", "==", "completed"),
        );

        const snapshot = await getDocs(q);
        const jobs = snapshot.docs.map((docSnapshot) => docSnapshot.data());

        const total = jobs.reduce((sum, job) => sum + (job.agreedFee || 0), 0);
        const completed = jobs.length;

        // This month earnings
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonth = jobs
          .filter((job) => {
            const completedAt = job.completedAt?.toDate?.();
            return completedAt && completedAt >= monthStart;
          })
          .reduce((sum, job) => sum + (job.agreedFee || 0), 0);

        setEarnings({ total, completed, thisMonth });
      } catch (error) {
        console.error("Error loading earnings:", error);
      }
    };

    loadEarnings();
  }, [uid]);

  const handleSaveProfile = async () => {
    if (!uid || !courierProfile) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", uid), {
        "courierProfile.vehicleType": vehicleType,
        "courierProfile.updatedAt": serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleUploadPhoto = async () => {
    if (!user || !photoFile) return;

    setUploadingPhoto(true);
    try {
      const fileName = `profilePhotos/${user.uid}/${Date.now()}_${
        photoFile.name
      }`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, photoFile);
      const url = await getDownloadURL(storageRef);

      await updateProfile(user, { photoURL: url });
      await updateDoc(doc(db, "users", user.uid), {
        profilePhotoUrl: url,
        updatedAt: serverTimestamp(),
      });

      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (error) {
      console.error("Error uploading profile photo:", error);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSignOut = async () => {
    if (!window.confirm("Sign out of your account?")) return;

    try {
      const auth = getAuthSafe();
      if (auth) {
        await auth.signOut();
        navigate("/login");
      }
    } catch (error) {
      console.error("Error signing out:", error);
      alert("Failed to sign out. Please try again.");
    }
  };

  if (authLoading || userLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-purple-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-purple-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const accountStatus = courierProfile?.status || "active";
  const statusBadge = (() => {
    const normalized = accountStatus.toLowerCase();
    if (normalized.includes("reject")) {
      return "bg-red-100 text-red-700";
    }
    if (normalized.includes("pending")) {
      return "bg-yellow-100 text-yellow-700";
    }
    if (normalized.includes("suspend") || normalized.includes("ban")) {
      return "bg-gray-200 text-gray-700";
    }
    return "bg-green-100 text-green-700";
  })();

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">
            {isAdmin ? "🔧 Admin Profile" : "Profile"}
          </h1>
          <p className="text-purple-100">
            Manage your {isAdmin ? "admin" : "courier"} account
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 space-y-4">
        {/* User Info Card */}
        <Card variant="elevated" className="animate-fade-in">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] flex items-center justify-center text-3xl text-white shadow-lg overflow-hidden">
                {photoPreview || user?.photoURL ? (
                  <img
                    src={photoPreview || user?.photoURL || ""}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{isAdmin ? "🔧" : "👤"}</span>
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {user?.email}
                </h2>
                <p className="text-sm text-gray-500">
                  {isAdmin ? "Admin Account" : "Courier Account"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                    Choose Photo
                  </label>
                  <button
                    type="button"
                    onClick={handleUploadPhoto}
                    disabled={!photoFile || uploadingPhoto}
                    className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-semibold text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {uploadingPhoto ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Earnings Card - Only for couriers */}
        {isCourier && (
          <Card variant="elevated" className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>💰</span>
                <span>Earnings</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
                  <p className="text-xs text-gray-500 mb-1">Total Earned</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">
                    {formatCurrency(earnings.total)}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-xs text-gray-500 mb-1">This Month</p>
                  <p className="text-xl sm:text-2xl font-bold text-blue-600">
                    {formatCurrency(earnings.thisMonth)}
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
                  <p className="text-xs text-gray-500 mb-1">Completed</p>
                  <p className="text-xl sm:text-2xl font-bold text-purple-600">
                    {earnings.completed}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vehicle Settings Card - Only for couriers */}
        {isCourier && (
          <Card
            variant="elevated"
            className="animate-slide-up animation-delay-100"
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🚗</span>
                <span>Vehicle Settings</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label
                  htmlFor="vehicleType"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Vehicle Type
                </label>
                <select
                  id="vehicleType"
                  value={vehicleType}
                  onChange={(e) =>
                    setVehicleType(e.target.value as VehicleType)
                  }
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                >
                  <option value="foot">🚶 Walking</option>
                  <option value="bike">🚲 Bike</option>
                  <option value="scooter">🛵 Scooter</option>
                  <option value="motorcycle">🏍️ Motorcycle</option>
                  <option value="car">🚗 Car</option>
                  <option value="van">🚐 Van</option>
                  <option value="truck">🚚 Truck</option>
                </select>
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving || vehicleType === courierProfile?.vehicleType}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${
                  saving || vehicleType === courierProfile?.vehicleType
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white hover:shadow-xl hover:scale-105"
                }`}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </CardContent>
          </Card>
        )}

        {/* Status Card */}
        <Card
          variant="elevated"
          className="animate-slide-up animation-delay-200"
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📊</span>
              <span>Account Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">
                  Account Status
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${statusBadge}`}
                >
                  {accountStatus}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <span className="text-sm font-medium text-gray-700">
                  Account Type
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    isAdmin
                      ? "bg-red-100 text-red-700"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {isAdmin ? "Admin" : "Courier"}
                </span>
              </div>

              {isCourier && (
                <>
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">
                      Online Status
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        courierProfile?.isOnline
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {courierProfile?.isOnline ? "Online" : "Offline"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">
                      Current Vehicle
                    </span>
                    <span className="text-sm font-semibold text-gray-900 capitalize">
                      {courierProfile?.vehicleType || "Not Set"}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions Card */}
        <Card
          variant="elevated"
          className="animate-slide-up animation-delay-300"
        >
          <CardContent className="p-6 space-y-3">
            <button
              onClick={handleSignOut}
              className="w-full py-3 px-4 rounded-xl border-2 border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-all"
            >
              Sign Out
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

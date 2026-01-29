
import { useEffect, useState } from "react";
import { LoadingState } from "@gosenderr/ui";
import { PackageRateCardBuilder } from "@/components/v2/PackageRateCardBuilder";
import { FoodRateCardBuilder } from "@/components/v2/FoodRateCardBuilder";
import { PackageRateCard, FoodRateCard } from "@gosenderr/shared";
import { db } from "@/lib/firebase";
import { getAuthSafe } from "@/lib/firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useNavigate, useSearchParams } from "react-router-dom";

type Mode = "view" | "edit-package" | "edit-food";

export default function RateCardsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<Mode>("view");
  const [packageRateCard, setPackageRateCard] =
    useState<PackageRateCard | null>(null);
  const [foodRateCard, setFoodRateCard] = useState<FoodRateCard | null>(null);
  const [packagesEnabled, setPackagesEnabled] = useState(false);
  const [foodEnabled, setFoodEnabled] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      navigate("/login");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      setCurrentUser(user);

      // Load courier profile
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        const courierProfile = data.courierProfile;

        if (courierProfile) {
          setPackageRateCard(courierProfile.packageRateCard || null);
          setFoodRateCard(courierProfile.foodRateCard || null);
          setPackagesEnabled(
            courierProfile.workModes?.packagesEnabled || false,
          );
          setFoodEnabled(courierProfile.workModes?.foodEnabled || false);
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSavePackageRateCard = async (rateCard: PackageRateCard) => {
    if (!currentUser) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        "courierProfile.packageRateCard": rateCard,
        "courierProfile.workModes.packagesEnabled": true,
      });

      setPackageRateCard(rateCard);
      setPackagesEnabled(true);
      setMode("view");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveFoodRateCard = async (rateCard: FoodRateCard) => {
    if (!currentUser) return;

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        "courierProfile.foodRateCard": rateCard,
        "courierProfile.workModes.foodEnabled": true,
      });

      setFoodRateCard(rateCard);
      setFoodEnabled(true);
      setMode("view");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePackages = async () => {
    if (!currentUser || !packageRateCard) return;

    const newValue = !packagesEnabled;
    await updateDoc(doc(db, "users", currentUser.uid), {
      "courierProfile.workModes.packagesEnabled": newValue,
    });

    setPackagesEnabled(newValue);
  };

  const handleToggleFood = async () => {
    if (!currentUser || !foodRateCard) return;

    const newValue = !foodEnabled;
    await updateDoc(doc(db, "users", currentUser.uid), {
      "courierProfile.workModes.foodEnabled": newValue,
    });

    setFoodEnabled(newValue);
  };

  if (loading) {
    return <LoadingState fullPage message="Loading rate cards..." />;
  }

  if (mode === "edit-package") {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-y-auto pb-24 safe-top bg-white">
        <PackageRateCardBuilder
          currentRateCard={packageRateCard || undefined}
          onSave={handleSavePackageRateCard}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 border-t border-gray-200">
          <button
            onClick={() => setMode("view")}
            disabled={saving}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            ← Back to Rate Cards
          </button>
        </div>
      </div>
    );
  }

  if (mode === "edit-food") {
    return (
      <div className="fixed inset-0 w-screen h-screen overflow-y-auto pb-24 safe-top bg-white">
        <FoodRateCardBuilder
          currentRateCard={foodRateCard || undefined}
          onSave={handleSaveFoodRateCard}
        />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 border-t border-gray-200">
          <button
            onClick={() => setMode("view")}
            disabled={saving}
            className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors"
          >
            ← Back to Rate Cards
          </button>
        </div>
      </div>
    );
  }

  const hasAnyRateCard = packageRateCard || foodRateCard;


  return (
    <div className="fixed inset-0 w-screen h-screen overflow-y-auto pb-24 safe-top bg-[#F8F9FF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
                💰 Rate Cards & Pricing
              </h1>
              <p className="text-base text-gray-600 mt-2">
                Set your rates and control which delivery types you accept
              </p>
            </div>
            <button
              onClick={() => navigate("/settings")}
              className="text-2xl hover:scale-110 transition-transform"
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Status Overview */}
        {hasAnyRateCard && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
            <div className={`rounded-xl p-4 ${packagesEnabled ? 'bg-emerald-50 border-2 border-emerald-300' : 'bg-gray-50 border-2 border-gray-200'}`}>
              <div className="text-sm font-medium text-gray-600 mb-1">Package Delivery</div>
              <div className={`text-xl font-bold ${packagesEnabled ? 'text-emerald-700' : 'text-gray-500'}`}>
                {packagesEnabled ? '✅ Active' : '⏸️ Paused'}
              </div>
            </div>
            <div className={`rounded-xl p-4 ${foodEnabled ? 'bg-orange-50 border-2 border-orange-300' : 'bg-gray-50 border-2 border-gray-200'}`}>
              <div className="text-sm font-medium text-gray-600 mb-1">Food Delivery</div>
              <div className={`text-xl font-bold ${foodEnabled ? 'text-orange-700' : 'text-gray-500'}`}>
                {foodEnabled ? '✅ Active' : '⏸️ Paused'}
              </div>
            </div>
          </div>
        )}

        {/* Package Deliveries Card */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden hover:border-gray-300 transition-colors shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">📦</span>
                  <h2 className="text-2xl font-bold text-gray-900">Package Delivery</h2>
                </div>
                <p className="text-sm text-gray-600">
                  Set rates and manage package delivery jobs
                </p>
              </div>
            </div>

            {packageRateCard ? (
              <div className="space-y-4 mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
                  <div className="text-sm text-gray-600 mb-3 font-medium">Current Rates & Limits</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Base Fare:</span>
                      <span className="font-bold text-gray-900">${packageRateCard.baseFare.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Per Mile:</span>
                      <span className="font-bold text-gray-900">${packageRateCard.perMile.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Per Minute:</span>
                      <span className="font-bold text-gray-900">${packageRateCard.perMinute.toFixed(2)}</span>
                    </div>
                    <div className="pt-2 border-t border-blue-300">
                      <div className="text-xs text-gray-600 mb-2 font-medium">Distance Limits:</div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">Max Pickup Distance:</span>
                          <span className="font-semibold">{packageRateCard.maxPickupDistanceMiles ? `${packageRateCard.maxPickupDistanceMiles} mi` : 'Unlimited'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">Max Delivery Distance:</span>
                          <span className="font-semibold">{packageRateCard.maxDeliveryDistanceMiles ? `${packageRateCard.maxDeliveryDistanceMiles} mi` : 'Unlimited'}</span>
                        </div>
                      </div>
                    </div>
                    {packageRateCard.optionalFees && packageRateCard.optionalFees.length > 0 && (
                      <div className="pt-2 border-t border-blue-200">
                        <div className="text-xs text-gray-600 mb-2">Optional Fees:</div>
                        <div className="space-y-1">
                          {packageRateCard.optionalFees.map((fee, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-700">{fee.name}:</span>
                              <span className="font-semibold">${fee.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleTogglePackages}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-colors ${
                      packagesEnabled
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {packagesEnabled ? '✅ Accept Packages' : '⏸️ Pause Packages'}
                  </button>
                  <button
                    onClick={() => setMode("edit-package")}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
                  >
                    📝 Edit Rates
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 rounded-xl p-6 text-center border-2 border-dashed border-blue-300">
                  <p className="text-gray-600 mb-4">No rate card set up yet</p>
                  <button
                    onClick={() => setMode("edit-package")}
                    className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors"
                  >
                    + Set Up Package Delivery
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Food Deliveries Card */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden hover:border-gray-300 transition-colors shadow-sm">
          <div className="p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-3xl">🍔</span>
                  <h2 className="text-2xl font-bold text-gray-900">Food Delivery</h2>
                </div>
                <p className="text-sm text-gray-600">
                  Set rates for restaurant and food deliveries
                </p>
              </div>
            </div>

            {foodRateCard ? (
              <div className="space-y-4 mb-6">
                <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                  <div className="text-sm text-gray-600 mb-3 font-medium">Current Rates & Limits</div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Base Fare:</span>
                      <span className="font-bold text-gray-900">${foodRateCard.baseFare.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Per Mile:</span>
                      <span className="font-bold text-gray-900">${foodRateCard.perMile.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-700">Restaurant Wait Pay:</span>
                      <span className="font-bold text-gray-900">${foodRateCard.restaurantWaitPay.toFixed(2)}/min</span>
                    </div>
                    <div className="pt-2 border-t border-amber-200">
                      <div className="text-xs text-gray-600 mb-2 font-medium">Distance Limits:</div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">Max Pickup Distance:</span>
                          <span className="font-semibold">{foodRateCard.maxPickupDistanceMiles ? `${foodRateCard.maxPickupDistanceMiles} mi` : 'Unlimited'}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">Max Delivery Distance:</span>
                          <span className="font-semibold">{foodRateCard.maxDeliveryDistanceMiles ? `${foodRateCard.maxDeliveryDistanceMiles} mi` : 'Unlimited'}</span>
                        </div>
                      </div>
                    </div>
                    {foodRateCard.peakHours && foodRateCard.peakHours.length > 0 && (
                      <div className="pt-2 border-t border-amber-200">
                        <div className="text-xs text-gray-600 mb-2">Peak Hours:</div>
                        <div className="space-y-1">
                          {foodRateCard.peakHours.map((peak, idx) => (
                            <div key={idx} className="text-sm text-gray-700">
                              {peak.days.join(", ")} {peak.startTime}-{peak.endTime} ({peak.multiplier}x)
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {foodRateCard.optionalFees && foodRateCard.optionalFees.length > 0 && (
                      <div className="pt-2 border-t border-amber-200">
                        <div className="text-xs text-gray-600 mb-2">Optional Fees:</div>
                        <div className="space-y-1">
                          {foodRateCard.optionalFees.map((fee, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-700">{fee.name}:</span>
                              <span className="font-semibold">${fee.amount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleToggleFood}
                    className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-colors ${
                      foodEnabled
                        ? 'bg-orange-500 text-white hover:bg-orange-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {foodEnabled ? '✅ Accept Food Orders' : '⏸️ Pause Food Orders'}
                  </button>
                  <button
                    onClick={() => setMode("edit-food")}
                    className="flex-1 py-3 px-4 rounded-xl font-semibold bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
                  >
                    📝 Edit Rates
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-orange-50 rounded-xl p-6 text-center border-2 border-dashed border-orange-300">
                  <p className="text-gray-600 mb-4">No rate card set up yet</p>
                  <button
                    onClick={() => setMode("edit-food")}
                    className="inline-block px-6 py-3 bg-orange-600 text-white rounded-xl font-semibold hover:bg-orange-700 transition-colors"
                  >
                    + Set Up Food Delivery
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Box */}
        {!hasAnyRateCard && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6">
            <div className="flex gap-3">
              <span className="text-2xl flex-shrink-0">ℹ️</span>
              <div>
                <h3 className="font-bold text-amber-900 mb-1">Get Started</h3>
                <p className="text-sm text-amber-800">
                  Set up at least one rate card to start accepting deliveries. You can enable/disable delivery types anytime.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

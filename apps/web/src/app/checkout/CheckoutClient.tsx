"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  updateDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getItem, Item } from "@/lib/v2/items";
import { AddressAutocomplete } from "@/components/v2/AddressAutocomplete";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import { calcMiles } from "@/lib/v2/pricing";
import {
  calculateCourierRate,
  JobInfo,
} from "@/lib/pricing/calculateCourierRate";
import type { UserDoc, FoodRateCard, PackageRateCard } from "@/lib/v2/types";

interface SellerProfile {
  stripeConnectAccountId?: string;
  email?: string;
}

interface CourierWithRate extends UserDoc {
  id: string;
  rateBreakdown: {
    courierEarnings: number;
    platformFee: number;
    totalCustomerCharge: number;
  };
}

export default function CheckoutClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const itemId = searchParams.get("itemId");
  const { user } = useAuthUser();
  const { flags } = useFeatureFlags();

  const [item, setItem] = useState<Item | null>(null);
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<
    "delivery" | "pickup" | null
  >(null);
  const [dropoffAddress, setDropoffAddress] = useState<any>(null);
  const [distance, setDistance] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);
  const [availableCouriers, setAvailableCouriers] = useState<CourierWithRate[]>(
    [],
  );
  const [selectedCourier, setSelectedCourier] =
    useState<CourierWithRate | null>(null);
  const [searchingCouriers, setSearchingCouriers] = useState(false);
  const [estimatedMinutes, setEstimatedMinutes] = useState(0);

  useEffect(() => {
    if (!itemId) {
      router.push("/marketplace");
      return;
    }

    const resolvedItemId = itemId;

    async function loadItem() {
      if (!resolvedItemId) {
        return;
      }
      try {
        const data = await getItem(resolvedItemId);
        if (!data) {
          router.push("/marketplace");
          return;
        }
        setItem(data);

        // Auto-select delivery method if only one option
        const methods = data.deliveryMethods || ["delivery"];
        if (methods.length === 1) {
          setSelectedDeliveryMethod(methods[0]);
        }

        const sellerRef = doc(db, "users", data.sellerId);
        const sellerSnap = await getDoc(sellerRef);
        if (sellerSnap.exists()) {
          setSeller(sellerSnap.data() as SellerProfile);
        }
      } catch (err) {
        console.error("Failed to load item:", err);
        setError("Failed to load item details.");
      } finally {
        setLoading(false);
      }
    }

    loadItem();
  }, [itemId, router]);

  useEffect(() => {
    if (!dropoffAddress || !item?.pickupLocation) {
      console.log("Missing data for distance calc:", {
        hasDropoff: !!dropoffAddress,
        hasItem: !!item,
        hasPickupLocation: !!item?.pickupLocation,
      });
      return;
    }

    console.log("Calculating distance:", {
      pickup: item.pickupLocation,
      dropoff: dropoffAddress,
    });

    // Validate coordinates
    if (!item.pickupLocation.lat || !item.pickupLocation.lng) {
      console.error(
        "Item pickup location missing lat/lng:",
        item.pickupLocation,
      );
      setError("Item location is not properly set. Please contact the seller.");
      return;
    }

    if (!dropoffAddress.lat || !dropoffAddress.lng) {
      console.error("Dropoff address missing lat/lng:", dropoffAddress);
      setError("Please select a valid delivery address from the dropdown.");
      return;
    }

    const miles = calcMiles(
      { lat: item.pickupLocation.lat, lng: item.pickupLocation.lng },
      { lat: dropoffAddress.lat, lng: dropoffAddress.lng },
    );

    console.log("Distance calculated:", miles, "miles");

    // Estimate delivery time (30 mph average)
    const minutes = Math.max(5, Math.round((miles / 30) * 60)); // Minimum 5 minutes
    setEstimatedMinutes(minutes);
  }, [dropoffAddress, item]);

  // Find available couriers when address is set
  useEffect(() => {
    if (!item || !dropoffAddress) {
      console.log("Skipping courier search:", {
        item: !!item,
        dropoffAddress: !!dropoffAddress,
      });
      return;
    }

    // Allow search even with 0 distance (same location deliveries)
    console.log("Starting courier search with distance:", distance);

    async function findCouriers() {
      setSearchingCouriers(true);
      setError(null);
      try {
        if (!item) {
          throw new Error("Item not found");
        }
        const isFoodItem = item.isFoodItem || item.category === "food";

        // Query couriers/runners - try multiple status field paths
        const usersRef = collection(db, "users");

        // First try the newer courierProfile.status path
        let q = query(usersRef, where("role", "in", ["courier", "runner"]));

        console.log("Querying all couriers/runners...");
        const snapshot = await getDocs(q);
        console.log(`Found ${snapshot.size} total couriers/runners`);

        // Filter by online status - courierProfile.isOnline is the correct field
        const onlineCouriers = snapshot.docs.filter((doc) => {
          const data = doc.data();
          const isOnline = data.courierProfile?.isOnline === true;

          console.log(`Courier ${doc.id}:`, {
            role: data.role,
            profileIsOnline: data.courierProfile?.isOnline,
            isOnline,
          });

          return isOnline;
        });

        console.log(`Found ${onlineCouriers.length} online couriers`);

        const couriers: CourierWithRate[] = [];

        for (const courierDoc of onlineCouriers) {
          const courierData = courierDoc.data() as UserDoc;

          console.log(`Checking Senderr ${courierDoc.id}:`, {
            hasPackageCard: !!courierData.courierProfile?.packageRateCard,
            hasFoodCard: !!courierData.courierProfile?.foodRateCard,
            hasLocation: !!courierData.location,
            role: courierData.role,
            status: courierData.courierProfile?.status,
            isOnline: courierData.courierProfile?.isOnline,
          });

          // Skip if no courierProfile
          if (!courierData.courierProfile) {
            console.log(`Senderr ${courierDoc.id} skipped: no courierProfile`);
            continue;
          }

          // Skip if not active
          if (courierData.courierProfile.status !== "active") {
            console.log(
              `Senderr ${courierDoc.id} skipped: not active (status: ${courierData.courierProfile.status})`,
            );
            continue;
          }

          // Get appropriate rate card based on item type
          const rateCard = isFoodItem
            ? courierData.courierProfile.foodRateCard
            : courierData.courierProfile.packageRateCard;

          if (!rateCard) {
            console.log(
              `Senderr ${courierDoc.id} skipped: no ${isFoodItem ? "food" : "package"} rate card`,
            );
            continue;
          }

          // Check work mode is enabled
          const workModeEnabled = isFoodItem
            ? courierData.courierProfile.workModes?.foodEnabled
            : courierData.courierProfile.workModes?.packagesEnabled;

          if (!workModeEnabled) {
            console.log(
              `Senderr ${courierDoc.id} skipped: ${isFoodItem ? "food" : "package"} mode disabled`,
            );
            continue;
          }

          // Skip if no location
          if (!courierData.location) {
            console.log(`Courier ${courierDoc.id} skipped: no location`);
            continue;
          }

          // Calculate distance from courier to pickup
          const courierToPickup = calcMiles(courierData.location, {
            lat: item.pickupLocation.lat,
            lng: item.pickupLocation.lng,
          });

          console.log(`Courier ${courierDoc.id} distances:`, {
            courierToPickup,
            deliveryDistance: distance,
            maxPickup: rateCard.maxPickupDistanceMiles,
            maxDelivery: rateCard.maxDeliveryDistanceMiles,
          });

          // Check if within courier's pickup radius
          if (
            rateCard.maxPickupDistanceMiles &&
            courierToPickup > rateCard.maxPickupDistanceMiles
          ) {
            console.log(
              `Courier ${courierDoc.id} skipped: outside pickup radius`,
            );
            continue;
          }

          // Check if delivery distance is within range (allow 0 distance)
          if (
            rateCard.maxDeliveryDistanceMiles &&
            distance > rateCard.maxDeliveryDistanceMiles
          ) {
            console.log(
              `Courier ${courierDoc.id} skipped: delivery distance too far`,
            );
            continue;
          }

          // Check food equipment requirements
          if (isFoodItem && item.foodDetails) {
            const equipment = courierData.courierProfile?.equipment || {};
            if (item.foodDetails.requiresCooler && !equipment.cooler) {
              console.log(`Courier ${courierDoc.id} skipped: no cooler`);
              continue;
            }
            if (item.foodDetails.requiresHotBag && !equipment.hot_bag) {
              console.log(`Courier ${courierDoc.id} skipped: no hot bag`);
              continue;
            }
            if (
              item.foodDetails.requiresDrinkCarrier &&
              !equipment.drink_carrier
            ) {
              console.log(`Courier ${courierDoc.id} skipped: no drink carrier`);
              continue;
            }
          }

          // Calculate pricing (use minimum 1 mile for 0 distance)
          const pricingDistance = Math.max(1, distance);
          const pricingMinutes = Math.max(5, estimatedMinutes);

          const jobInfo: JobInfo = {
            distance: pricingDistance,
            estimatedMinutes: pricingMinutes,
            isFoodItem,
          };

          const rateBreakdown = calculateCourierRate(
            rateCard as FoodRateCard | PackageRateCard,
            jobInfo,
          );

          console.log(`Courier ${courierDoc.id} pricing:`, rateBreakdown);

          couriers.push({
            ...courierData,
            id: courierDoc.id,
            rateBreakdown,
          });
        }

        // Sort by price (cheapest first)
        couriers.sort(
          (a, b) =>
            a.rateBreakdown.totalCustomerCharge -
            b.rateBreakdown.totalCustomerCharge,
        );

        console.log(`Found ${couriers.length} eligible couriers`);

        setAvailableCouriers(couriers);

        // Auto-select cheapest courier
        if (couriers.length > 0) {
          setSelectedCourier(couriers[0]);
          console.log("Auto-selected courier:", couriers[0].id);
        } else {
          console.log("No eligible couriers found");
        }
      } catch (err) {
        console.error("Error finding couriers:", err);
        setError("Failed to find available couriers");
      } finally {
        setSearchingCouriers(false);
      }
    }

    findCouriers();
  }, [item, dropoffAddress]); // Removed distance/estimatedMinutes from deps to allow immediate search

  const deliveryFee = useMemo(() => {
    if (selectedCourier) {
      return selectedCourier.rateBreakdown.courierEarnings;
    }
    // Fallback to simple calculation if no courier selected
    const fee = 5 + distance * 1.25;
    return Math.max(8, Number(fee.toFixed(2)));
  }, [distance, selectedCourier]);

  const platformFee = useMemo(() => {
    if (selectedCourier) {
      return selectedCourier.rateBreakdown.platformFee;
    }
    return 2.5;
  }, [selectedCourier]);
  const total = useMemo(() => {
    if (!item) return 0;
    return Number((item.price + deliveryFee + platformFee).toFixed(2));
  }, [item, deliveryFee]);

  const handleCheckout = async () => {
    if (!item || !selectedDeliveryMethod) return;

    // For pickup orders, no Stripe or delivery address needed
    if (selectedDeliveryMethod === "pickup") {
      if (!user) {
        setError("You must be logged in to complete this order");
        return;
      }
      setCheckingOut(true);
      setError(null);

      try {
        const orderRef = await addDoc(collection(db, "marketplaceOrders"), {
          itemId: item.id,
          itemTitle: item.title,
          sellerId: item.sellerId,
          buyerId: user.uid,
          buyerEmail: user.email || null,
          deliveryMethod: selectedDeliveryMethod,
          pickupLocation: item.pickupLocation,
          itemPrice: item.price,
          total: item.price,
          status: "pending_pickup",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        router.push(
          `/marketplace?checkout=success&order=${orderRef.id}&pickup=true`,
        );
      } catch (err: any) {
        console.error("Pickup order error:", err);
        setError(err.message || "Failed to create pickup order");
      } finally {
        setCheckingOut(false);
      }
      return;
    }

    // For delivery orders, require Stripe and dropoff address
    if (!seller?.stripeConnectAccountId || !dropoffAddress || !selectedCourier)
      return;
    setCheckingOut(true);
    setError(null);

    try {
      const orderRef = await addDoc(collection(db, "marketplaceOrders"), {
        itemId: item.id,
        itemTitle: item.title,
        sellerId: item.sellerId,
        buyerId: user?.uid || null,
        buyerEmail: user?.email || null,
        deliveryMethod: selectedDeliveryMethod,
        dropoffAddress,
        courierId: selectedCourier.id,
        distance,
        estimatedMinutes,
        deliveryFee,
        platformFee,
        itemPrice: item.price,
        total,
        status: "pending",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const origin = window.location.origin;
      const response = await fetch("/api/stripe/marketplace-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemTitle: item.title,
          itemPrice: item.price,
          deliveryFee,
          platformFee,
          sellerStripeAccountId: seller.stripeConnectAccountId,
          courierStripeAccountId:
            selectedCourier.courierProfile?.stripeConnectAccountId || null,
          successUrl: `${origin}/marketplace?checkout=success&order=${orderRef.id}`,
          cancelUrl: `${origin}/checkout?itemId=${item.id}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      await updateDoc(orderRef, {
        checkoutSessionId: data.sessionId,
        updatedAt: serverTimestamp(),
      });

      window.location.href = data.url;
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "Checkout failed");
    } finally {
      setCheckingOut(false);
    }
  };

  if (!flags?.marketplace?.combinedPayments) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <Card variant="elevated" className="max-w-md">
          <CardContent>
            <h2 className="text-lg font-semibold">Checkout Disabled</h2>
            <p className="text-sm text-gray-600 mt-2">
              Combined marketplace checkout is currently disabled.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading checkout...</div>
      </div>
    );
  }

  if (!item) return null;

  const availableMethods = item.deliveryMethods || ["delivery"];
  const hasBothOptions = availableMethods.length === 2;
  const isPickup = selectedDeliveryMethod === "pickup";

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>{isPickup ? "Arrange Pickup" : "Checkout"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-gray-900">{item.title}</p>
              <p className="text-sm text-gray-600">
                Item price: ${item.price.toFixed(2)}
              </p>
            </div>

            {/* Delivery Method Selector (if both options available) */}
            {hasBothOptions && (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Choose Delivery Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedDeliveryMethod("delivery")}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedDeliveryMethod === "delivery"
                        ? "border-purple-600 bg-purple-50"
                        : "border-gray-300 bg-white hover:border-gray-400"
                    }`}
                  >
                    <div className="text-sm font-semibold">🚚 Delivery</div>
                    <div className="text-xs text-gray-600 mt-1">Fees apply</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedDeliveryMethod("pickup")}
                    className={`p-3 rounded-lg border-2 transition ${
                      selectedDeliveryMethod === "pickup"
                        ? "border-purple-600 bg-purple-50"
                        : "border-gray-300 bg-white hover:border-gray-400"
                    }`}
                  >
                    <div className="text-sm font-semibold">📦 Pickup</div>
                    <div className="text-xs text-gray-600 mt-1">FREE</div>
                  </button>
                </div>
              </div>
            )}

            {isPickup && selectedDeliveryMethod && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-semibold text-green-800">
                  📦 Pickup Item
                </p>
                <p className="text-sm text-green-700 mt-1">
                  No payment needed online. Arrange pickup with seller and pay
                  in person.
                </p>
                <p className="text-xs text-green-600 mt-2">
                  <strong>Pickup location:</strong>{" "}
                  {item.pickupLocation?.address}
                </p>
              </div>
            )}
            {!isPickup && selectedDeliveryMethod && (
              <div className="mt-4">
                <AddressAutocomplete
                  label="Delivery Address"
                  placeholder="Enter dropoff address"
                  onSelect={(result) => setDropoffAddress(result)}
                  required
                />
              </div>
            )}
            {!isPickup && selectedDeliveryMethod && dropoffAddress && (
              <>
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white/80 rounded-xl p-3">
                    <p className="text-gray-500">Distance</p>
                    <p className="font-semibold">{distance.toFixed(1)} miles</p>
                  </div>
                  <div className="bg-white/80 rounded-xl p-3">
                    <p className="text-gray-500">Est. Time</p>
                    <p className="font-semibold">{estimatedMinutes} min</p>
                  </div>
                </div>

                {/* Courier Selection */}
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Select Senderr
                  </label>
                  {searchingCouriers ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
                      Finding available Senderrs...
                    </div>
                  ) : availableCouriers.length === 0 ? (
                    <div className="text-center py-8 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-semibold text-yellow-800">
                        No couriers available
                      </p>
                      <p className="text-xs text-yellow-700 mt-1">
                        Try adjusting your delivery address or check back later.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {availableCouriers.map((courier) => (
                        <button
                          key={courier.id}
                          type="button"
                          onClick={() => setSelectedCourier(courier)}
                          className={`w-full p-3 rounded-lg border-2 transition text-left ${
                            selectedCourier?.id === courier.id
                              ? "border-purple-600 bg-purple-50"
                              : "border-gray-300 bg-white hover:border-gray-400"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-sm">
                                {courier.displayName || "Courier"}
                              </p>
                              <p className="text-xs text-gray-600 mt-1">
                                {courier.courierProfile?.vehicleType ||
                                  "Vehicle"}{" "}
                                •{" "}
                                {courier.courierProfile?.vehicleDetails?.make ||
                                  ""}{" "}
                                {courier.courierProfile?.vehicleDetails
                                  ?.model || ""}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-purple-600">
                                $
                                {courier.rateBreakdown.totalCustomerCharge.toFixed(
                                  2,
                                )}
                              </p>
                              <p className="text-xs text-gray-500">total</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Item</span>
                <span className="font-semibold">${item.price.toFixed(2)}</span>
              </div>
              {!isPickup && (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Delivery</span>
                    <span className="font-semibold">
                      ${deliveryFee.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Platform fee</span>
                    <span className="font-semibold">
                      ${platformFee.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
              {isPickup && (
                <div className="flex items-center justify-between text-green-600">
                  <span>Pickup (FREE)</span>
                  <span className="font-semibold">$0.00</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-base font-bold">
                <span>Total</span>
                <span className="text-purple-600">
                  ${isPickup ? item.price.toFixed(2) : total.toFixed(2)}
                </span>
              </div>
            </div>

            {!isPickup && !seller?.stripeConnectAccountId && (
              <div className="mt-4 rounded-xl bg-yellow-50 p-3 text-sm text-yellow-800">
                Seller has not completed Stripe Connect onboarding yet.
              </div>
            )}

            {error && (
              <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={
                checkingOut ||
                !selectedDeliveryMethod ||
                (!isPickup &&
                  (!dropoffAddress ||
                    !selectedCourier ||
                    !seller?.stripeConnectAccountId))
              }
              className="mt-6 w-full rounded-xl bg-purple-600 text-white py-3 font-semibold hover:bg-purple-700 transition disabled:opacity-60"
            >
              {checkingOut
                ? "Processing..."
                : !selectedDeliveryMethod
                  ? "Select Delivery Method"
                  : !isPickup && !selectedCourier
                    ? "Select a Courier"
                    : isPickup
                      ? "Confirm Pickup Order"
                      : "Pay with Stripe"}
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

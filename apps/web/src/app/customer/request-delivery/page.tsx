"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { ItemDoc, UserDoc, FoodTemperature } from "@gosenderr/shared";
import { calcMiles } from "@/lib/v2/pricing";
import {
  calculateCourierRate,
  JobInfo,
} from "@/lib/pricing/calculateCourierRate";
import { AddressAutocomplete } from "@/components/v2/AddressAutocomplete";
import {
  CourierSelector,
  CourierWithRate,
} from "@/components/v2/CourierSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { FloatingButton } from "@/components/ui/FloatingButton";
import { NotFoundPage } from "@/components/ui/NotFoundPage";

interface DropoffAddress {
  address: string;
  lat: number;
  lng: number;
}

interface ItemDocWithId extends ItemDoc {
  id: string;
}

export default function RequestDeliveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuthUser();

  const [item, setItem] = useState<ItemDocWithId | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dropoffAddress, setDropoffAddress] = useState<DropoffAddress | null>(
    null,
  );
  const [distance, setDistance] = useState<number>(0);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(0);
  const [availableCouriers, setAvailableCouriers] = useState<CourierWithRate[]>(
    [],
  );
  const [selectedCourier, setSelectedCourier] =
    useState<CourierWithRate | null>(null);
  const [searchingCouriers, setSearchingCouriers] = useState(false);

  // Step 1: Load item from URL params
  useEffect(() => {
    const id = searchParams?.get("itemId");
    if (!id) {
      setError("No item specified");
      setLoading(false);
      return;
    }
    setItemId(id);
  }, [searchParams]);

  useEffect(() => {
    if (!itemId) return;

    async function loadItem() {
      try {
        const itemRef = doc(db, "items", itemId!);
        const itemSnap = await getDoc(itemRef);

        if (!itemSnap.exists()) {
          setError("Item not found");
          setLoading(false);
          return;
        }

        const itemData = itemSnap.data() as ItemDoc;
        const itemWithId: ItemDocWithId = { ...itemData, id: itemSnap.id };
        setItem(itemWithId);
        setLoading(false);
      } catch (err) {
        console.error("Error loading item:", err);
        setError("Failed to load item");
        setLoading(false);
      }
    }

    loadItem();
  }, [itemId]);

  // Step 2: Calculate distance and duration when dropoff changes
  useEffect(() => {
    if (!item || !dropoffAddress) return;

    const pickup = item.pickupLocation;
    const dropoff = dropoffAddress;

    // Calculate distance using Haversine
    const dist = calcMiles(
      { lat: pickup.lat, lng: pickup.lng },
      { lat: dropoff.lat, lng: dropoff.lng },
    );
    setDistance(dist);

    // Estimate duration: 30 mph average speed
    const minutes = Math.round((dist / 30) * 60);
    setEstimatedMinutes(minutes);
  }, [item, dropoffAddress]);

  // Step 3: Find available couriers when distance is calculated
  useEffect(() => {
    if (!item || !dropoffAddress || distance === 0) return;

    async function findCouriers() {
      setSearchingCouriers(true);
      setAvailableCouriers([]);
      setSelectedCourier(null);

      try {
        const usersRef = collection(db, "users");
        const courierQuery = query(
          usersRef,
          where("courierProfile.status", "==", "active"),
          where("averageRating", ">=", 3.5),
        );

        const snapshot = await getDocs(courierQuery);
        const couriers: CourierWithRate[] = [];

        for (const docSnap of snapshot.docs) {
          const courierData = docSnap.data() as UserDoc;
          const courier: CourierWithRate = {
            ...courierData,
            id: docSnap.id,
            distance: 0, // Will be set below
            rateBreakdown: {} as any, // Will be set below
          };

          if (!courier.courierProfile) continue;

          // Check work mode
          const workModeEnabled = item!.isFoodItem
            ? courier.courierProfile.workModes.foodEnabled
            : courier.courierProfile.workModes.packagesEnabled;

          if (!workModeEnabled) continue;

          // Check service radius
          if (!courier.courierProfile.currentLocation) continue;

          const courierToPickup = calcMiles(
            {
              lat: courier.courierProfile.currentLocation.lat,
              lng: courier.courierProfile.currentLocation.lng,
            },
            { lat: item!.pickupLocation.lat, lng: item!.pickupLocation.lng },
          );

          if (courierToPickup > courier.courierProfile.serviceRadius) continue;

          // Update courier distance
          courier.distance = courierToPickup;

          // Check equipment requirements for food items
          if (item!.isFoodItem && item!.foodDetails) {
            const equipment = courier.courierProfile.equipment;
            const foodDetails = item!.foodDetails;

            if (foodDetails.requiresCooler && !equipment.cooler?.approved)
              continue;
            if (
              foodDetails.requiresHotBag &&
              !equipment.hot_bag?.approved &&
              !equipment.insulated_bag?.approved
            )
              continue;
            if (
              foodDetails.requiresDrinkCarrier &&
              !equipment.drink_carrier?.approved
            )
              continue;
          }

          // Calculate rate
          const rateCard = item!.isFoodItem
            ? courier.courierProfile.foodRateCard
            : courier.courierProfile.packageRateCard;

          const jobInfo: JobInfo = {
            distance: distance,
            estimatedMinutes: estimatedMinutes,
            isFoodItem: item!.isFoodItem,
          };

          const rateBreakdown = calculateCourierRate(rateCard, jobInfo);

          // Update courier rate breakdown
          courier.rateBreakdown = rateBreakdown;

          couriers.push(courier);
        }

        // Sort by price (cheapest first)
        couriers.sort(
          (a, b) =>
            a.rateBreakdown.totalCustomerCharge -
            b.rateBreakdown.totalCustomerCharge,
        );

        setAvailableCouriers(couriers);
      } catch (err) {
        console.error("Error finding couriers:", err);
        setError("Failed to find available couriers");
      } finally {
        setSearchingCouriers(false);
      }
    }

    findCouriers();
  }, [item, dropoffAddress, distance, estimatedMinutes]);

  const handleCourierSelect = (courier: CourierWithRate) => {
    setSelectedCourier(courier);
  };

  const handleProceedToPayment = () => {
    if (!selectedCourier || !itemId || !item || !dropoffAddress) return;

    // Build checkout URL with all necessary parameters
    const params = new URLSearchParams({
      itemId,
      courierId: selectedCourier.id,
      pickupAddress: item.pickupLocation.address,
      dropoffAddress: dropoffAddress.address,
      dropoffLat: dropoffAddress.lat.toString(),
      dropoffLng: dropoffAddress.lng.toString(),
      distance: distance.toString(),
      estimatedMinutes: estimatedMinutes.toString(),
    });

    // Navigate to checkout page
    router.push(`/customer/checkout?${params.toString()}`);
  };

  // Auth gate
  if (authLoading) {
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
    router.push(
      "/login?redirect=/customer/request-delivery" +
        (itemId ? `?itemId=${itemId}` : ""),
    );
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-purple-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-purple-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <NotFoundPage
        title={error || "Item not found"}
        description="Please choose another item to deliver."
        actionHref="/marketplace"
        actionLabel="Back to Marketplace"
        emoji="📦"
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar fallback={user?.displayName || "Customer"} size="lg" />
              <div>
                <h1 className="text-2xl font-bold">Request Delivery</h1>
                <p className="text-purple-100 text-sm">{item.title}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/15 rounded-2xl p-4">
              <p className="text-xs text-purple-100">Item Price</p>
              <p className="text-xl font-bold">${item.price.toFixed(2)}</p>
            </div>
            <div className="bg-white/15 rounded-2xl p-4">
              <p className="text-xs text-purple-100">Pickup</p>
              <p className="text-sm font-semibold">
                {item.pickupLocation.address}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8 space-y-6">
        {/* Step 1: Item Summary */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              {item.photos && item.photos[0] && (
                <img
                  src={item.photos[0]}
                  alt={item.title}
                  className="w-full sm:w-32 h-32 object-cover rounded-2xl"
                />
              )}
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1">{item.title}</h3>
                <p className="text-2xl font-bold text-green-600 mb-2">
                  ${item.price.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Pickup:</span>{" "}
                  {item.pickupLocation.address}
                </p>
                {item.isFoodItem && item.foodDetails && (
                  <div className="mt-3">
                    <span
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white"
                      style={{
                        backgroundColor: getTemperatureColor(
                          item.foodDetails.temperature,
                        ),
                      }}
                    >
                      {item.foodDetails.temperature
                        .replace("_", " ")
                        .toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Dropoff Address */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle>Delivery Address</CardTitle>
          </CardHeader>
          <CardContent>
            <AddressAutocomplete
              label="Where should this be delivered?"
              placeholder="Enter delivery address..."
              onSelect={(result) => setDropoffAddress(result)}
              required
            />
            {dropoffAddress && (
              <div className="mt-4 rounded-2xl bg-green-50 border border-green-100 p-4">
                <div className="text-sm text-green-800">
                  <span className="font-semibold">Distance:</span>{" "}
                  {distance.toFixed(2)} miles
                </div>
                <div className="text-sm text-green-800">
                  <span className="font-semibold">Estimated time:</span>{" "}
                  {estimatedMinutes} minutes
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step 3: Available Couriers */}
        {dropoffAddress && (
          <Card variant="elevated" className="animate-fade-in">
            <CardHeader>
              <CardTitle>Available Couriers</CardTitle>
            </CardHeader>
            <CardContent>
              {searchingCouriers ? (
                <div className="py-10 text-center text-sm text-gray-600">
                  Finding available couriers...
                </div>
              ) : (
                <CourierSelector
                  couriers={availableCouriers}
                  selectedCourierId={selectedCourier?.id || null}
                  onSelect={handleCourierSelect}
                  isFoodItem={item.isFoodItem}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Selection Summary & Proceed */}
        {selectedCourier && (
          <Card
            variant="elevated"
            className="border-2 border-purple-200 animate-fade-in"
          >
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Courier earnings</span>
                  <span className="font-semibold">
                    ${selectedCourier.rateBreakdown.courierEarnings.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Platform fee</span>
                  <span className="font-semibold">
                    ${selectedCourier.rateBreakdown.platformFee.toFixed(2)}
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-base font-bold">
                  <span>Total delivery cost</span>
                  <span className="text-purple-600">
                    $
                    {selectedCourier.rateBreakdown.totalCustomerCharge.toFixed(
                      2,
                    )}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                You'll be charged after the delivery is completed.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <FloatingButton
        icon="💳"
        position="bottom-center"
        onClick={handleProceedToPayment}
        disabled={!selectedCourier}
        className={!selectedCourier ? "opacity-50 pointer-events-none" : ""}
      >
        Checkout
      </FloatingButton>
    </div>
  );
}

function getTemperatureColor(temp: FoodTemperature): string {
  switch (temp) {
    case "hot":
      return "#dc2626";
    case "cold":
      return "#2563eb";
    case "frozen":
      return "#06b6d4";
    case "room_temp":
      return "#f59e0b";
    default:
      return "#6b7280";
  }
}

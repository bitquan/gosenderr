
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { UserDoc, FoodTemperature } from "@gosenderr/shared";
import type { MarketplaceItem } from "@/types/marketplace";
import { marketplaceService } from "@/services/marketplace.service";
import { calcMiles } from "@/lib/v2/pricing";
import {
  calculateCourierRate,
  JobInfo,
} from "@/lib/pricing/calculateCourierRate";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";
import { AddressAutocomplete } from "@/components/v2/AddressAutocomplete";
import { getRoleDisplay } from "@gosenderr/shared";
import {
  CourierSelector,
  CourierWithRate,
} from "@/components/v2/CourierSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { FloatingButton } from "@/components/ui/FloatingButton";
import { NotFoundPage } from "@/components/ui/NotFoundPage";
import {
  extractPostalCodeFromAddress,
  getPickupDisplayAddress,
} from "@/lib/pickupPrivacy";

interface DropoffAddress {
  address: string;
  lat: number;
  lng: number;
}


type DeliveryItem = Omit<MarketplaceItem, "pickupLocation"> & {
  pickupLocation: {
    address: string;
    city?: string;
    state?: string;
    postalCode?: string;
    lat: number;
    lng: number;
  };
  sellerSharesExactPickup: boolean;
  isFoodItem: boolean;
  foodDetails?: {
    temperature: FoodTemperature;
    requiresCooler?: boolean;
    requiresHotBag?: boolean;
    requiresDrinkCarrier?: boolean;
  };
};

export default function RequestDeliveryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuthUser();
  const { settings: platformSettings } = usePlatformSettings();

  const [item, setItem] = useState<DeliveryItem | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);
  const [bookingLinkId, setBookingLinkId] = useState<string | null>(null);
  const [bookingLinkResolved, setBookingLinkResolved] = useState(false);
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
  const [showTabs, setShowTabs] = useState(false);

  // Step 1: Load item from URL params (optional)
  useEffect(() => {
    const id = searchParams?.get("itemId");
    const bookingId = searchParams?.get("bookingLink");
    setItemId(id);
    setBookingLinkId(bookingId);
    setBookingLinkResolved(false);
  }, [searchParams]);

  // Resolve and validate seller-generated booking links.
  useEffect(() => {
    if (!bookingLinkId || bookingLinkResolved) return;

    async function resolveBookingLink() {
      try {
        const linkRef = doc(db, "sellerBookingLinks", bookingLinkId);
        const linkSnap = await getDoc(linkRef);

        if (!linkSnap.exists()) {
          setError("This booking link is invalid.");
          setLoading(false);
          return;
        }

        const linkData = linkSnap.data() as any;
        if (linkData.isActive === false) {
          setError("This booking link is no longer active.");
          setLoading(false);
          return;
        }

        if (typeof linkData.itemId === "string") {
          if (!itemId || itemId !== linkData.itemId) {
            setItemId(linkData.itemId);
          }
        }

        await updateDoc(linkRef, {
          openCount: increment(1),
          lastOpenedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setBookingLinkResolved(true);
      } catch (err) {
        console.error("Error resolving booking link:", err);
        setError("Failed to open booking link.");
        setLoading(false);
      }
    }

    resolveBookingLink();
  }, [bookingLinkId, bookingLinkResolved, itemId]);

  useEffect(() => {
    if (!itemId) return;

    async function loadItem() {
      try {
        const fetchedItem = await marketplaceService.getItem(itemId!);

        if (!fetchedItem) {
          setError("Item not found");
          setLoading(false);
          return;
        }

        const pickupLocation = fetchedItem.pickupLocation as any;
        const location = pickupLocation?.location as any;
        const lat = location?.latitude ?? pickupLocation?.lat;
        const lng = location?.longitude ?? pickupLocation?.lng;

        if (lat == null || lng == null) {
          setError("Pickup location is missing for this item");
          setLoading(false);
          return;
        }

        let sellerSharesExactPickup = false;
        try {
          const sellerSnap = await getDoc(doc(db, "users", fetchedItem.sellerId));
          if (sellerSnap.exists()) {
            const sellerData = sellerSnap.data() as any;
            sellerSharesExactPickup =
              sellerData?.sellerProfile?.shareExactPickupLocation === true ||
              sellerData?.sellerProfile?.localSellingConfig?.shareExactPickupLocation === true;
          }
        } catch (sellerError) {
          console.error("Failed to load seller pickup privacy settings:", sellerError);
        }

        const itemWithId: DeliveryItem = {
          ...fetchedItem,
          pickupLocation: {
            address: pickupLocation?.address || "Pickup location",
            city: pickupLocation?.city || "",
            state: pickupLocation?.state || "",
            postalCode:
              pickupLocation?.postalCode ||
              extractPostalCodeFromAddress(pickupLocation?.address || ""),
            lat,
            lng,
          },
          sellerSharesExactPickup,
          isFoodItem: (fetchedItem as any).category === "food",
        };

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
    setSearchingCouriers(true);
    setAvailableCouriers([]);
    setSelectedCourier(null);

    const usersRef = collection(db, "users");
    const courierQuery = query(
      usersRef,
      where("role", "==", "courier"),
      where("courierProfile.isOnline", "==", true),
    );

    const unsubscribe = onSnapshot(
      courierQuery,
      (snapshot) => {
        const couriers: CourierWithRate[] = [];

        snapshot.forEach((docSnap) => {
          const courierData = docSnap.data() as UserDoc;
          const courier: CourierWithRate = {
            ...courierData,
            id: docSnap.id,
            distance: 0, // Will be set below
            rateBreakdown: {} as any, // Will be set below
          };

          if (!courier.courierProfile) return;

          const courierStatus = courier.courierProfile.status as string | undefined;
          if (
            courierStatus &&
            courierStatus !== "approved" &&
            courierStatus !== "active"
          ) {
            return;
          }

          // Check work mode
          const workModes = courier.courierProfile.workModes;
          const workModeEnabled = item!.isFoodItem
            ? workModes?.foodEnabled ?? true
            : workModes?.packagesEnabled ?? true;

          if (!workModeEnabled) return;

          // Check service radius
          if (!courier.courierProfile.currentLocation) return;

          const courierToPickup = calcMiles(
            {
              lat: courier.courierProfile.currentLocation.lat,
              lng: courier.courierProfile.currentLocation.lng,
            },
            { lat: item!.pickupLocation.lat, lng: item!.pickupLocation.lng },
          );

          if (courierToPickup > courier.courierProfile.serviceRadius) return;

          // Update courier distance
          courier.distance = courierToPickup;

          // Check equipment requirements for food items
          if (item!.isFoodItem && item!.foodDetails) {
            const equipment = courier.courierProfile.equipment;
            const foodDetails = item!.foodDetails;

            if (foodDetails.requiresCooler && !equipment.cooler?.approved)
              return;
            if (
              foodDetails.requiresHotBag &&
              !equipment.hot_bag?.approved &&
              !equipment.insulated_bag?.approved
            )
              return;
            if (
              foodDetails.requiresDrinkCarrier &&
              !equipment.drink_carrier?.approved
            )
              return;
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

          const rateBreakdown = calculateCourierRate(rateCard, jobInfo, new Date(), {
            platformFeeFood: platformSettings.platformFeeFood,
            platformFeePackage: platformSettings.platformFeePackage,
          });

          // Update courier rate breakdown
          courier.rateBreakdown = rateBreakdown;

          couriers.push(courier);
        });

        // Sort by price (cheapest first)
        couriers.sort(
          (a, b) =>
            a.rateBreakdown.totalCustomerCharge -
            b.rateBreakdown.totalCustomerCharge,
        );

        setAvailableCouriers(couriers);
        setSearchingCouriers(false);
      },
      (err) => {
        console.error("Error finding couriers:", err);
        setError("Failed to find available couriers");
        setSearchingCouriers(false);
      },
    );

    return () => unsubscribe();
  }, [item, dropoffAddress, distance, estimatedMinutes, platformSettings]);

  const handleCourierSelect = (courier: CourierWithRate) => {
    setSelectedCourier(courier);
  };

  const handleProceedToPayment = () => {
    if (!selectedCourier || !itemId || !item || !dropoffAddress) return;

    // Build checkout URL with all necessary parameters
    const params = new URLSearchParams({
      itemId,
      courierId: selectedCourier.id,
      dropoffAddress: dropoffAddress.address,
      dropoffLat: dropoffAddress.lat.toString(),
      dropoffLng: dropoffAddress.lng.toString(),
      distance: distance.toString(),
      estimatedMinutes: estimatedMinutes.toString(),
    });

    // Navigate to checkout page
    navigate(`/checkout?${params.toString()}`);
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
    navigate(
      "/login?redirect=/request-delivery" +
        (itemId ? `&itemId=${itemId}` : ""),
    );
    return null;
  }

  if (!itemId && bookingLinkId && loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-purple-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-purple-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!itemId) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] pb-24">
        <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold">Request a Delivery</h1>
            <p className="text-purple-100 text-sm">
              Choose a marketplace item or create a custom send.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-6 -mt-8 space-y-6">
          <div className="md:hidden flex items-center justify-between">
            <button
              onClick={() => setShowTabs((prev) => !prev)}
              className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-gray-700 shadow border border-gray-100"
            >
              <span className="text-lg">☰</span>
              Delivery Options
            </button>
          </div>
          <div className={`bg-white rounded-2xl shadow-lg p-2 flex gap-2 ${showTabs ? 'flex' : 'hidden'} md:flex`}>
            <button
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-all"
              onClick={() => navigate('/marketplace')}
            >
              Marketplace Item
            </button>
            <button
              className="flex-1 py-3 px-4 rounded-xl font-semibold bg-green-600 text-white shadow-md"
              onClick={() => navigate('/jobs/new')}
            >
              Custom Send
            </button>
          </div>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Marketplace Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Pick an item from the marketplace and request delivery from a seller.
              </p>
              <button
                onClick={() => navigate("/marketplace")}
                className="px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
              >
                Browse Marketplace
              </button>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Custom Delivery</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Send anything that isn’t listed in the marketplace. Enter pickup and dropoff details.
              </p>
              <button
                onClick={() => navigate("/jobs/new")}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700"
              >
                Create Custom Send
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
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
        description="Please choose another item to deliver or create a custom send."
        actionHref="/marketplace"
        actionLabel="Back to Marketplace"
        emoji="📦"
      />
    );
  }

  const pickupDisplayAddress = getPickupDisplayAddress(
    item.pickupLocation,
    item.sellerSharesExactPickup,
  );

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar
                fallback={user?.displayName || getRoleDisplay("customer").name}
                size="lg"
              />
              <div>
                <h1 className="text-2xl font-bold">Request Send</h1>
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
              <p className="text-sm font-semibold">{pickupDisplayAddress}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8 space-y-6">
        <div className="md:hidden flex items-center justify-between">
          <button
            onClick={() => setShowTabs((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-gray-700 shadow border border-gray-100"
          >
            <span className="text-lg">☰</span>
            Delivery Options
          </button>
        </div>
        <div className={`bg-white rounded-2xl shadow-lg p-2 flex gap-2 ${showTabs ? 'flex' : 'hidden'} md:flex`}>
          <button
            className="flex-1 py-3 px-4 rounded-xl font-semibold bg-purple-600 text-white shadow-md"
            onClick={() => navigate(`/request-delivery?itemId=${itemId}`)}
          >
            Marketplace Item
          </button>
          <button
            className="flex-1 py-3 px-4 rounded-xl font-semibold text-gray-600 hover:bg-gray-50 transition-all"
            onClick={() => navigate('/jobs/new')}
          >
            Custom Send
          </button>
        </div>
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
                  {pickupDisplayAddress}
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
            <CardTitle>Send To Address</CardTitle>
          </CardHeader>
          <CardContent>
            <AddressAutocomplete
              label="Where should this be sent?"
              placeholder="Enter send address..."
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
              <CardTitle>Available Sendrs</CardTitle>
            </CardHeader>
            <CardContent>
              {searchingCouriers ? (
                <div className="py-10 text-center text-sm text-gray-600">
                  Finding available Sendrs...
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
                  <span className="text-gray-600">Senderr earnings</span>
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
                  <span>Total send cost</span>
                  <span className="text-purple-600">
                    $
                    {selectedCourier.rateBreakdown.totalCustomerCharge.toFixed(
                      2,
                    )}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                You'll be charged after the send is completed.
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

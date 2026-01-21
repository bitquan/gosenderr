"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import {
  ItemDoc,
  UserDoc,
  DeliveryJobDoc,
  JobStatus,
  FoodRateCard,
  PackageRateCard,
} from "@gosenderr/shared";
import {
  calculateCourierRate,
  JobInfo,
} from "@/lib/pricing/calculateCourierRate";
import { getItem } from "@/lib/v2/items";

interface ItemDocWithId extends ItemDoc {
  id: string;
}

interface CourierDocWithId extends UserDoc {
  id: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuthUser();

  const [item, setItem] = useState<ItemDocWithId | null>(null);
  const [courier, setCourier] = useState<CourierDocWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  // Pricing breakdown
  const [itemPrice, setItemPrice] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [platformFee, setPlatformFee] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Delivery details from URL
  const itemId = searchParams?.get("itemId");
  const courierId = searchParams?.get("courierId");
  const pickupAddress = searchParams?.get("pickupAddress");
  const dropoffAddress = searchParams?.get("dropoffAddress");
  const distance = parseFloat(searchParams?.get("distance") || "0");
  const estimatedMinutes = parseInt(
    searchParams?.get("estimatedMinutes") || "0",
  );

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Load item and courier data
  useEffect(() => {
    // Wait for auth to load before fetching data
    if (authLoading) return;

    if (!itemId || !courierId) {
      setError("Missing required parameters");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        // Ensure Firebase is initialized
        if (!db) {
          setError(
            "Database connection not available. Please refresh the page.",
          );
          setLoading(false);
          return;
        }

        // Load item
        const itemData = await getItem(itemId!);
        if (!itemData) {
          setError("Item not found");
          setLoading(false);
          return;
        }
        setItem({ ...itemData, id: itemId! } as ItemDocWithId);
        setItemPrice(itemData.price);

        // Load courier
        const courierRef = doc(db, "users", courierId!);
        const courierSnap = await getDoc(courierRef);
        if (!courierSnap.exists()) {
          setError("Courier not found");
          setLoading(false);
          return;
        }
        const courierData = courierSnap.data() as UserDoc;
        setCourier({ ...courierData, id: courierSnap.id } as CourierDocWithId);

        // Calculate delivery pricing
        if (distance > 0 && estimatedMinutes > 0) {
          // Determine if food or package
          const isFood = itemData.isFoodItem || itemData.category === "food";

          const jobInfo: JobInfo = {
            distance,
            estimatedMinutes,
            isFoodItem: isFood,
          };
          const rateCard = isFood
            ? courierData.courierProfile?.foodRateCard ||
              courierData.courier?.rateCard
            : courierData.courierProfile?.packageRateCard ||
              courierData.courier?.rateCard;

          if (!rateCard) {
            setError("Courier has no rate card configured");
            setLoading(false);
            return;
          }

          // Cast legacy RateCard if needed
          const typedRateCard = rateCard as FoodRateCard | PackageRateCard;
          const pricing = calculateCourierRate(typedRateCard, jobInfo);
          setDeliveryFee(pricing.courierEarnings);
          setPlatformFee(pricing.platformFee);
          setTotalAmount(
            itemData.price + pricing.courierEarnings + pricing.platformFee,
          );
        }

        setLoading(false);
      } catch (err) {
        console.error("Error loading data:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load checkout data";
        if (errorMessage.includes("Missing or insufficient permissions")) {
          setError("Unable to connect to database. Please refresh the page.");
        } else {
          setError("Failed to load checkout data");
        }
        setLoading(false);
      }
    }

    loadData();
  }, [itemId, courierId, distance, estimatedMinutes, authLoading]);

  // Create payment intent
  useEffect(() => {
    if (!item || !courier || totalAmount === 0) return;

    async function createPaymentIntent() {
      try {
        const response = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: Math.round(totalAmount * 100), // Convert to cents
            currency: "usd",
            customerId: user?.uid,
            jobId: `temp_${Date.now()}`, // Temporary ID
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create payment intent");
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (err) {
        console.error("Error creating payment intent:", err);
        setError("Failed to initialize payment");
      }
    }

    createPaymentIntent();
  }, [item, courier, totalAmount, user]);

  const handlePayment = async () => {
    if (!item || !courier || !user) return;

    setProcessing(true);
    setError(null);

    try {
      // Create delivery job
      const jobId = `job_${Date.now()}`;
      const jobData: DeliveryJobDoc = {
        itemId: item.id,
        customerId: user.uid,
        sellerId: item.sellerId,
        courierId: courier.id,
        jobType: item.isFoodItem ? "food" : "package",
        priority: item.isFoodItem ? 100 : 50,
        status: JobStatus.OPEN,

        pickup: {
          lat: item.pickupLocation.lat,
          lng: item.pickupLocation.lng,
          address: pickupAddress || item.pickupLocation.address,
          contactPhone: "",
        },

        dropoff: {
          lat: parseFloat(searchParams?.get("dropoffLat") || "0"),
          lng: parseFloat(searchParams?.get("dropoffLng") || "0"),
          address: dropoffAddress || "",
          contactPhone: "",
        },

        estimatedDistance: distance,
        estimatedDuration: estimatedMinutes,

        pricing: {
          baseFare: deliveryFee,
          perMileCharge: 0, // Already included in deliveryFee
          timeCharge: item.isFoodItem ? undefined : 0,
          optionalFees: [],
          platformFee: platformFee,
          totalCustomerCharge: totalAmount,
          courierEarnings: deliveryFee,
        },
        paymentStatus: "pending",
        stripePaymentIntentId: clientSecret?.split("_secret_")[0] || "",
        timeline: {
          orderPlaced: serverTimestamp() as any,
        },
        customerConfirmation: {
          received: false,
          deadline: serverTimestamp() as any, // Will be set properly by Cloud Function
          autoConfirmed: false,
        },

        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      };

      // Save job to Firestore
      await setDoc(doc(db, "deliveryJobs", jobId), jobData);

      // Update item status to "sold"
      await updateDoc(doc(db, "items", item.id), {
        status: "sold",
        soldAt: serverTimestamp(),
        soldTo: user.uid,
        deliveryJobId: jobId,
      });

      // Mock successful payment for MVP (replace with actual Stripe payment later)
      await updateDoc(doc(db, "deliveryJobs", jobId), {
        status: "pending_pickup",
        paymentStatus: "paid",
        paidAt: serverTimestamp(),
      });

      // Redirect to job tracking page
      router.push(`/customer/jobs/${jobId}`);
    } catch (err) {
      console.error("Error processing checkout:", err);
      setError("Payment failed. Please try again.");
      setProcessing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Checkout Error
          </h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!item || !courier) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
          <p className="text-gray-600">
            Review your order and complete payment
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Item Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Item Details
              </h2>
              <div className="flex gap-4">
                {item.photos && item.photos.length > 0 && (
                  <img
                    src={item.photos[0]}
                    alt={item.title}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {item.description}
                  </p>
                  <p className="text-lg font-bold text-green-600 mt-2">
                    ${item.price.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Delivery Details
              </h2>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pickup</p>
                  <p className="text-gray-900">
                    {pickupAddress || item.pickupLocation.address}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Dropoff</p>
                  <p className="text-gray-900">{dropoffAddress}</p>
                </div>
                <div className="flex gap-4 pt-2 border-t">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Distance
                    </p>
                    <p className="text-gray-900">{distance.toFixed(1)} miles</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      Estimated Time
                    </p>
                    <p className="text-gray-900">{estimatedMinutes} min</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Courier Details */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Your Courier
              </h2>
              <div className="flex items-center gap-4">
                {courier.profilePhotoUrl && (
                  <img
                    src={courier.profilePhotoUrl}
                    alt={courier.displayName || "Courier"}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900">
                    {courier.displayName || "Courier"}
                  </h3>
                  {courier.averageRating > 0 && (
                    <p className="text-sm text-gray-600">
                      ⭐ {courier.averageRating.toFixed(1)} (
                      {courier.totalDeliveries || 0} deliveries)
                    </p>
                  )}
                  {courier.courierProfile?.vehicleDetails && (
                    <p className="text-sm text-gray-600 capitalize">
                      {courier.courierProfile.vehicleType} -{" "}
                      {courier.courierProfile.vehicleDetails.make}{" "}
                      {courier.courierProfile.vehicleDetails.model}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Payment Summary
              </h2>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">Item Price</span>
                  <span className="text-gray-900 font-medium">
                    ${itemPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="text-gray-900 font-medium">
                    ${deliveryFee.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Platform Fee</span>
                  <span className="text-gray-900 font-medium">
                    ${platformFee.toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="text-lg font-bold text-gray-900">Total</span>
                  <span className="text-lg font-bold text-green-600">
                    ${totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Button (MVP: Mock payment) */}
              <button
                onClick={handlePayment}
                disabled={processing}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {processing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </span>
                ) : (
                  "Complete Payment"
                )}
              </button>

              <p className="text-xs text-gray-500 text-center mt-4">
                🔒 Secure payment • Payment will be held until delivery is
                complete
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

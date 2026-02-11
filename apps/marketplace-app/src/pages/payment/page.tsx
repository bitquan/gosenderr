
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { PaymentForm } from "@/components/v2/PaymentForm";
import { db } from "@/lib/firebase/firestore";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";

interface OrderDetails {
  itemId: string;
  courierId: string;
  courierName?: string;
  courierRate: number;
  platformFee: number;
  pickupAddress: string;
  dropoffAddress: string;
  itemTitle?: string;
  itemDescription?: string;
}

const createTempJobId = () => {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj?.randomUUID) {
    return `temp_${Date.now()}_${cryptoObj.randomUUID()}`;
  }
  if (!cryptoObj?.getRandomValues) {
    throw new Error("Secure random generator unavailable");
  }
  const bytes = new Uint32Array(2);
  cryptoObj.getRandomValues(bytes);
  const suffix = Array.from(bytes, (value) => value.toString(36)).join("");
  return `temp_${Date.now()}_${suffix}`;
};

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuthUser();
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const jobId = searchParams.get("jobId");
    const paymentIntentId = searchParams.get("payment_intent");
    if (jobId) {
      setIsCreatingJob(true);
      updateDoc(doc(db, "jobs", jobId), {
        paymentStatus: "authorized",
        paymentIntentId: paymentIntentId || null,
        updatedAt: serverTimestamp(),
      })
        .then(() => navigate(`/jobs/${jobId}`))
        .catch((err: any) => {
          console.error("Error updating job payment:", err);
          setError(err.message || "Failed to update payment status");
        })
        .finally(() => setIsCreatingJob(false));
      return;
    }

    // Try to get order details from sessionStorage first
    const storedDetails = sessionStorage.getItem("orderDetails");
    if (storedDetails) {
      try {
        setOrderDetails(JSON.parse(storedDetails));
        return;
      } catch (e) {
        console.error("Failed to parse stored order details:", e);
      }
    }

    // Fallback to query params
    const itemId = searchParams.get("itemId");
    const courierId = searchParams.get("courierId");
    const courierRate = searchParams.get("courierRate");
    const platformFee = searchParams.get("platformFee");
    const dropoffAddress = searchParams.get("dropoffAddress");

    if (
      !itemId ||
      !courierId ||
      !courierRate ||
      !platformFee ||
      !dropoffAddress
    ) {
      setError("Missing required order information. Please start over.");
      return;
    }

    setOrderDetails({
      itemId,
      courierId,
      courierName: searchParams.get("courierName") || undefined,
      courierRate: parseFloat(courierRate),
      platformFee: parseFloat(platformFee),
      pickupAddress: searchParams.get("pickupAddress") || "Pickup location",
      dropoffAddress,
      itemTitle: searchParams.get("itemTitle") || undefined,
      itemDescription: searchParams.get("itemDescription") || undefined,
    });
  }, [searchParams]);

  const handlePaymentSuccess = async () => {
    if (!orderDetails || !user) {
      setError("Missing user or order information");
      return;
    }

    setIsCreatingJob(true);
    setError(null);

    try {
      // Generate a temporary job ID for payment
      const tempJobId = createTempJobId();

      // Create delivery job in Firestore
      const deliveryJobData = {
        customerId: user.uid,
        courierId: orderDetails.courierId,
        itemId: orderDetails.itemId,
        status: "pending",
        paymentStatus: "authorized",
        pricing: {
          courierRate: orderDetails.courierRate,
          platformFee: orderDetails.platformFee,
          totalAmount: orderDetails.courierRate + orderDetails.platformFee,
        },
        pickup: {
          address: orderDetails.pickupAddress,
        },
        dropoff: {
          address: orderDetails.dropoffAddress,
        },
        stripePaymentIntentId: tempJobId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const jobRef = await addDoc(
        collection(db, "deliveryJobs"),
        deliveryJobData,
      );

      await addDoc(collection(db, "marketplaceOrders"), {
        itemId: orderDetails.itemId,
        itemTitle: orderDetails.itemTitle || "Senderrplace Item",
        sellerId: null,
        buyerId: user.uid,
        dropoffAddress: {
          address: orderDetails.dropoffAddress,
        },
        deliveryFee: orderDetails.courierRate,
        platformFee: orderDetails.platformFee,
        itemPrice: 0,
        total: orderDetails.courierRate + orderDetails.platformFee,
        status: "pending",
        deliveryJobId: jobRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update item status to 'pending'
      if (orderDetails.itemId) {
        const itemRef = doc(db, "marketplaceItems", orderDetails.itemId);
        await updateDoc(itemRef, {
          status: "pending",
          updatedAt: serverTimestamp(),
        });
      }

      // Clear session storage
      sessionStorage.removeItem("orderDetails");

      // Navigate to job tracking page
      navigate(`/jobs/${jobRef.id}`);
    } catch (err: any) {
      console.error("Error creating delivery job:", err);
      setError(err.message || "Failed to create delivery job");
      setIsCreatingJob(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 flex items-center justify-center px-6">
        <Card variant="elevated" className="max-w-md w-full">
          <CardContent>
            <div className="text-center py-6">
              <h2 className="text-2xl font-bold mb-4">
                Authentication Required
              </h2>
              <p className="text-gray-600 mb-4">
                Please log in to continue with payment.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="bg-purple-600 text-white py-2 px-6 rounded-xl hover:bg-purple-700 transition"
              >
                Go to Login
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !orderDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 flex items-center justify-center px-6">
        <Card variant="elevated" className="max-w-md w-full">
          <CardContent>
            <div className="text-center py-6">
              <h2 className="text-xl font-bold mb-2">Error</h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <button
                onClick={() => navigate("/marketplace")}
                className="bg-purple-600 text-white py-2 px-4 rounded-xl hover:bg-purple-700 transition"
              >
                Back to Senderrplace
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!orderDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-purple-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-purple-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  const totalAmount = orderDetails.courierRate + orderDetails.platformFee;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 pb-24">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar fallback={user?.displayName || "Customer"} size="lg" />
              <div>
                <h1 className="text-2xl font-bold">Complete Your Order</h1>
                <p className="text-purple-100 text-sm">
                  Review your order and pay securely
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card variant="elevated" className="animate-fade-in">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {orderDetails.itemTitle && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500">Item</h3>
                  <p className="text-gray-900 font-semibold">
                    {orderDetails.itemTitle}
                  </p>
                  {orderDetails.itemDescription && (
                    <p className="text-sm text-gray-600 mt-1">
                      {orderDetails.itemDescription}
                    </p>
                  )}
                </div>
              )}

              {orderDetails.courierName && (
                <div className="mb-4">
                  <h3 className="text-xs font-semibold text-gray-500">
                    Courier
                  </h3>
                  <p className="text-gray-900">{orderDetails.courierName}</p>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500">
                  Pickup Address
                </h3>
                <p className="text-gray-900">{orderDetails.pickupAddress}</p>
              </div>

              <div className="mb-4">
                <h3 className="text-xs font-semibold text-gray-500">
                  Dropoff Address
                </h3>
                <p className="text-gray-900">{orderDetails.dropoffAddress}</p>
              </div>

              <div className="border-t border-gray-100 pt-4 mt-4">
                <h3 className="text-sm font-semibold mb-3">
                  Pricing Breakdown
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Senderr Rate</span>
                    <span>${orderDetails.courierRate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Platform Fee</span>
                    <span>${orderDetails.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t border-gray-100">
                    <span>Total</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="elevated" className="animate-fade-in">
            <CardHeader>
              <CardTitle>Payment Process</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• Payment will be pre-authorized (not charged yet)</li>
                <li>• Funds captured after successful delivery</li>
                <li>• Automatic refund if cancelled before pickup</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div>
          {isCreatingJob ? (
            <Card variant="elevated" className="animate-fade-in">
              <CardContent>
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                  <p className="text-gray-600">Creating your delivery job...</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <PaymentForm
              jobId={`pending_${Date.now()}`}
              courierRate={orderDetails.courierRate}
              platformFee={orderDetails.platformFee}
              onSuccess={() => handlePaymentSuccess()}
            />
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

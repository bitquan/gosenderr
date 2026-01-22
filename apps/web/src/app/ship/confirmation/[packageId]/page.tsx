"use client";

import { use, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { GlassCard } from "@/components/GlassCard";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

function CheckoutForm({ packageId }: { packageId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setMessage(error.message || "An unexpected error occurred.");
      setIsProcessing(false);
    } else if (paymentIntent && paymentIntent.status === "succeeded") {
      // Update package status
      await updateDoc(doc(db, "packages", packageId), {
        paymentStatus: "paid",
        currentStatus: "pickup_pending",
        paidAt: new Date(),
      });

      setMessage("Payment successful! Your package is being processed.");

      // Send confirmation email/SMS (would be handled by Cloud Function)

      setTimeout(() => {
        router.push(`/customer/packages/${packageId}`);
      }, 2000);
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />

      {message && (
        <div
          style={{
            marginTop: "16px",
            padding: "12px",
            borderRadius: "8px",
            backgroundColor: message.includes("successful")
              ? "#d1fae5"
              : "#fee2e2",
            color: message.includes("successful") ? "#059669" : "#dc2626",
          }}
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={isProcessing || !stripe || !elements}
        style={{
          width: "100%",
          marginTop: "24px",
          padding: "16px",
          backgroundColor:
            isProcessing || !stripe || !elements ? "#9ca3af" : "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: "8px",
          fontSize: "18px",
          fontWeight: 600,
          cursor:
            isProcessing || !stripe || !elements ? "not-allowed" : "pointer",
        }}
      >
        {isProcessing ? "Processing..." : "Pay Now"}
      </button>
    </form>
  );
}

export default function ShipConfirmationPage({
  params,
}: {
  params: Promise<{ packageId: string }>;
}) {
  const { packageId } = use(params);
  const searchParams = useSearchParams();
  const clientSecret = searchParams.get("payment_intent_client_secret");
  const [packageData, setPackageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPackageData();
  }, [packageId]);

  const loadPackageData = async () => {
    try {
      const docSnap = await getDoc(doc(db, "packages", packageId));
      if (docSnap.exists()) {
        setPackageData({ id: docSnap.id, ...docSnap.data() });
      }
    } catch (error) {
      console.error("Error loading package:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ textAlign: "center" }}>Loading...</div>
      </div>
    );
  }

  if (!clientSecret || !packageData) {
    return (
      <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
        <GlassCard>
          <h1 style={{ color: "#dc2626" }}>Payment Error</h1>
          <p>Unable to process payment. Please try again.</p>
        </GlassCard>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px", maxWidth: "800px", margin: "0 auto" }}>
      <GlassCard style={{ marginBottom: "24px" }}>
        <h1 style={{ marginTop: 0 }}>Complete Your Payment</h1>

        <div
          style={{
            padding: "16px",
            backgroundColor: "#f3f4f6",
            borderRadius: "8px",
            marginBottom: "24px",
          }}
        >
          <h3 style={{ marginTop: 0, marginBottom: "8px" }}>
            Shipment Details
          </h3>
          <div style={{ fontSize: "14px", color: "#4b5563" }}>
            <div>
              <strong>Tracking Number:</strong> {packageData.trackingNumber}
            </div>
            <div>
              <strong>From:</strong> {packageData.origin.address}
            </div>
            <div>
              <strong>To:</strong> {packageData.destination.address}
            </div>
            <div
              style={{
                marginTop: "8px",
                fontSize: "20px",
                fontWeight: 600,
                color: "#059669",
              }}
            >
              Total: ${packageData.pricing?.customerPaid?.toFixed(2)}
            </div>
          </div>
        </div>
      </GlassCard>

      <GlassCard>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm packageId={packageId} />
        </Elements>
      </GlassCard>
    </div>
  );
}

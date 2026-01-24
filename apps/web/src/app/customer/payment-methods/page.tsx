"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
);

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  createdAt: any;
}

function AddPaymentMethodForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuthSafe();
    if (auth) {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) setUserId(user.uid);
      });
      return () => unsubscribe();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !userId) return;

    setLoading(true);
    setError(null);

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    try {
      // Create payment method with Stripe
      const { paymentMethod, error: stripeError } =
        await stripe.createPaymentMethod({
          type: "card",
          card: cardElement,
        });

      if (stripeError) {
        setError(stripeError.message || "Failed to add payment method");
        setLoading(false);
        return;
      }

      if (!paymentMethod) {
        setError("Failed to create payment method");
        setLoading(false);
        return;
      }

      // Save to Firestore
      await addDoc(collection(db, "paymentMethods"), {
        userId,
        stripePaymentMethodId: paymentMethod.id,
        brand: paymentMethod.card?.brand || "unknown",
        last4: paymentMethod.card?.last4 || "0000",
        expiryMonth: paymentMethod.card?.exp_month || 0,
        expiryYear: paymentMethod.card?.exp_year || 0,
        isDefault: false,
        createdAt: serverTimestamp(),
      });

      cardElement.clear();
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to save payment method");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 border border-gray-200 rounded-xl">
        <CardElement
          options={{
            style: {
              base: {
                fontSize: "16px",
                color: "#424770",
                "::placeholder": {
                  color: "#aab7c4",
                },
              },
              invalid: {
                color: "#9e2146",
              },
            },
          }}
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full px-4 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Adding..." : "Add Payment Method"}
      </button>
    </form>
  );
}

export default function PaymentMethodsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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

      setUserId(user.uid);
      await fetchPaymentMethods(user.uid);
    });

    return () => unsubscribe();
  }, [router]);

  const fetchPaymentMethods = async (uid: string) => {
    setLoading(true);
    const q = query(
      collection(db, "paymentMethods"),
      where("userId", "==", uid),
    );
    const snapshot = await getDocs(q);
    const methods = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PaymentMethod[];
    setPaymentMethods(methods);
    setLoading(false);
  };

  const handleDelete = async (methodId: string) => {
    if (!confirm("Are you sure you want to remove this payment method?"))
      return;

    try {
      await deleteDoc(doc(db, "paymentMethods", methodId));
      setPaymentMethods((prev) => prev.filter((m) => m.id !== methodId));
    } catch (err) {
      alert("Failed to delete payment method");
    }
  };

  const handleAddSuccess = async () => {
    setShowAddForm(false);
    if (userId) {
      await fetchPaymentMethods(userId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Payment Methods</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
          >
            {showAddForm ? "Cancel" : "+ Add Card"}
          </button>
        </div>

        {showAddForm && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Add New Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise}>
                <AddPaymentMethodForm onSuccess={handleAddSuccess} />
              </Elements>
            </CardContent>
          </Card>
        )}

        {paymentMethods.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="py-12 text-center">
              <div className="text-6xl mb-4">💳</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No payment methods saved
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Add a payment method to make checkout faster
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
              >
                Add Your First Card
              </button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <Card key={method.id} variant="elevated">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xl font-bold">
                        {method.brand === "visa"
                          ? "V"
                          : method.brand === "mastercard"
                            ? "M"
                            : "💳"}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 capitalize">
                          {method.brand} •••• {method.last4}
                        </p>
                        <p className="text-sm text-gray-500">
                          Expires {method.expiryMonth}/{method.expiryYear}
                        </p>
                        {method.isDefault && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(method.id)}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
                    >
                      Remove
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card variant="outlined">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔒</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Your payment information is secure
                </p>
                <p className="text-xs text-gray-500">
                  We use Stripe to securely store your payment details. Your
                  card information is encrypted and never stored on our servers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

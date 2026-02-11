"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

interface PromoCode {
  id: string;
  code: string;
  description: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  expiresAt: any;
  usesRemaining?: number;
  active: boolean;
}

export default function PromoCodesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [testCode, setTestCode] = useState("");
  const [testAmount, setTestAmount] = useState(50);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    message: string;
    discount?: number;
  } | null>(null);

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

      await fetchPromoCodes();
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchPromoCodes = async () => {
    setLoading(true);
    const q = query(
      collection(db, "promoCodes"),
      where("active", "==", true),
    );
    const snapshot = await getDocs(q);
    const codes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PromoCode[];

    // Filter out expired codes
    const now = new Date();
    const activeCodes = codes.filter((code) => {
      if (!code.expiresAt) return true;
      const expiryDate = code.expiresAt.toDate();
      return expiryDate > now;
    });

    setPromoCodes(activeCodes);
    setLoading(false);
  };

  const validatePromoCode = async () => {
    if (!testCode.trim()) {
      setValidationResult({
        valid: false,
        message: "Please enter a promo code",
      });
      return;
    }

    const code = promoCodes.find(
      (p) => p.code.toLowerCase() === testCode.toLowerCase(),
    );

    if (!code) {
      setValidationResult({
        valid: false,
        message: "Invalid promo code",
      });
      return;
    }

    if (testAmount < code.minOrderValue) {
      setValidationResult({
        valid: false,
        message: `Minimum order value is $${code.minOrderValue}`,
      });
      return;
    }

    if (code.usesRemaining !== undefined && code.usesRemaining <= 0) {
      setValidationResult({
        valid: false,
        message: "This promo code has been fully redeemed",
      });
      return;
    }

    let discount = 0;
    if (code.discountType === "percentage") {
      discount = (testAmount * code.discountValue) / 100;
      if (code.maxDiscount && discount > code.maxDiscount) {
        discount = code.maxDiscount;
      }
    } else {
      discount = code.discountValue;
    }

    setValidationResult({
      valid: true,
      message: `Success! You save $${discount.toFixed(2)}`,
      discount,
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert(`Copied: ${code}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Promo Codes</h1>

        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🎉</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  Save on your next delivery
                </p>
                <p className="text-xs text-gray-500">
                  Apply promo codes at checkout to get discounts on delivery
                  fees
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Promo Code Tester */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Test Promo Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Promo Code
                  </label>
                  <input
                    type="text"
                    value={testCode}
                    onChange={(e) =>
                      setTestCode(e.target.value.toUpperCase())
                    }
                    placeholder="SAVE20"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Amount ($)
                  </label>
                  <input
                    type="number"
                    value={testAmount}
                    onChange={(e) =>
                      setTestAmount(parseFloat(e.target.value) || 0)
                    }
                    min="0"
                    step="0.01"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <button
                onClick={validatePromoCode}
                className="w-full px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition"
              >
                Validate Code
              </button>
              {validationResult && (
                <div
                  className={`p-4 rounded-xl ${
                    validationResult.valid
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      validationResult.valid ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {validationResult.message}
                  </p>
                  {validationResult.valid && validationResult.discount && (
                    <p className="text-xs text-gray-600 mt-1">
                      Final amount: $
                      {(testAmount - validationResult.discount).toFixed(2)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available Promo Codes */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Available Promotions
          </h2>
          {promoCodes.length === 0 ? (
            <Card variant="elevated">
              <CardContent className="py-12 text-center">
                <div className="text-6xl mb-4">🎫</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No active promo codes
                </h3>
                <p className="text-sm text-gray-500">
                  Check back later for special offers and discounts
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promoCodes.map((promo) => (
                <Card key={promo.id} variant="elevated">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl font-bold text-purple-600 font-mono">
                            {promo.code}
                          </span>
                          <button
                            onClick={() => copyCode(promo.code)}
                            className="p-1 rounded hover:bg-gray-100 transition"
                            title="Copy code"
                          >
                            📋
                          </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {promo.description}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Discount:</span>
                        <span className="font-semibold text-gray-900">
                          {promo.discountType === "percentage"
                            ? `${promo.discountValue}% off`
                            : `$${promo.discountValue} off`}
                        </span>
                      </div>
                      {promo.maxDiscount && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Max discount:</span>
                          <span className="font-semibold text-gray-900">
                            ${promo.maxDiscount}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Min order:</span>
                        <span className="font-semibold text-gray-900">
                          ${promo.minOrderValue}
                        </span>
                      </div>
                      {promo.expiresAt && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Expires:</span>
                          <span className="font-semibold text-gray-900">
                            {promo.expiresAt.toDate().toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {promo.usesRemaining !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Uses left:</span>
                          <span className="font-semibold text-gray-900">
                            {promo.usesRemaining}
                          </span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setTestCode(promo.code);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="w-full mt-4 px-4 py-2 rounded-lg bg-purple-50 text-purple-600 font-medium hover:bg-purple-100 transition"
                    >
                      Test This Code
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* How to Use */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>How to Use Promo Codes</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
              <li>Copy the promo code from this page</li>
              <li>Create a delivery request or marketplace order</li>
              <li>At checkout, paste the code in the promo code field</li>
              <li>Click "Apply" to see your discount</li>
              <li>Complete your order with the discounted price</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

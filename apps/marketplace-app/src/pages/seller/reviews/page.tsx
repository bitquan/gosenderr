"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Card, CardContent } from "@/components/ui/Card";

interface Rating {
  id: string;
  orderId?: string;
  itemId?: string;
  itemName?: string;
  sellerId?: string;
  customerId?: string;
  itemRating?: number;
  sellerRating?: number;
  averageRating?: number;
  review: string | null;
  sellerResponse?: string | null;
  sellerResponseAt?: any;
  type: "delivery" | "marketplace";
  createdAt: any;
}

export default function SellerReviewsPage() {
  const { uid } = useAuthUser();
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "ratings"),
      where("type", "==", "marketplace"),
      where("sellerId", "==", uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ratingData = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        })) as Rating[];
        setReviews(ratingData);
        setLoadingReviews(false);
      },
      (error) => {
        console.error("Error fetching seller reviews:", error);
        setLoadingReviews(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate?.() || new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`text-lg ${
              star <= rating ? "text-yellow-400" : "text-gray-300"
            }`}
          >
            ⭐
          </span>
        ))}
      </div>
    );
  };

  const handleSubmitResponse = async (reviewId: string) => {
    const response = responseDrafts[reviewId]?.trim();
    if (!response) {
      alert("Please write a response before submitting.");
      return;
    }

    try {
      setSubmittingId(reviewId);
      await updateDoc(doc(db, "ratings", reviewId), {
        sellerResponse: response,
        sellerResponseAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error saving seller response:", error);
      alert("Failed to save response. Please try again.");
    } finally {
      setSubmittingId(null);
    }
  };

  const averageSellerRating = (() => {
    const valid = reviews.filter((r) => typeof r.sellerRating === "number");
    if (valid.length === 0) return 0;
    const sum = valid.reduce((acc, r) => acc + (r.sellerRating || 0), 0);
    return sum / valid.length;
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Seller Reviews</h1>
            <p className="text-sm text-gray-600 mt-1">
              Feedback from customers on your marketplace orders
            </p>
          </div>
          <Link
            to="/seller/dashboard"
            className="text-sm font-semibold text-purple-600 hover:text-purple-700"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card variant="elevated">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {reviews.length}
              </div>
              <div className="text-xs text-gray-600">Total Reviews</div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {averageSellerRating ? averageSellerRating.toFixed(1) : "—"}
              </div>
              <div className="text-xs text-gray-600">Avg Seller Rating</div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {reviews.filter((r) => r.review).length}
              </div>
              <div className="text-xs text-gray-600">Written Reviews</div>
            </CardContent>
          </Card>
        </div>

        {/* Reviews List */}
        {loadingReviews ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                Loading reviews...
              </div>
            </CardContent>
          </Card>
        ) : reviews.length === 0 ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-5xl mb-4">⭐</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  No Reviews Yet
                </h3>
                <p className="text-gray-600">
                  Reviews will appear here after customers rate their orders.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id} variant="elevated">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🛍️</span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {review.itemName || "Senderrplace Order"}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Order {review.orderId ? `#${review.orderId.slice(0, 8).toUpperCase()}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(review.createdAt)}
                    </div>
                  </div>

                  {/* Ratings */}
                  <div className="mb-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Item Quality:</span>
                      <div className="flex items-center gap-2">
                        {renderStars(review.itemRating || 0)}
                        <span className="text-sm text-gray-600">
                          {review.itemRating || 0}/5
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Seller Service:</span>
                      <div className="flex items-center gap-2">
                        {renderStars(review.sellerRating || 0)}
                        <span className="text-sm text-gray-600">
                          {review.sellerRating || 0}/5
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Review Text */}
                  {review.review && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-gray-700">{review.review}</p>
                    </div>
                  )}

                  {/* Seller Response */}
                  <div className="mt-4 border-t pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">
                      Your Response
                    </h4>
                    {review.sellerResponse ? (
                      <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 mb-3">
                        <p className="text-sm text-purple-900">{review.sellerResponse}</p>
                        {review.sellerResponseAt && (
                          <p className="text-xs text-purple-600 mt-2">
                            Responded on {formatDate(review.sellerResponseAt)}
                          </p>
                        )}
                      </div>
                    ) : null}

                    <textarea
                      value={responseDrafts[review.id] ?? review.sellerResponse ?? ""}
                      onChange={(e) =>
                        setResponseDrafts((prev) => ({
                          ...prev,
                          [review.id]: e.target.value,
                        }))
                      }
                      placeholder="Write a short response to this review..."
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {(responseDrafts[review.id] ?? review.sellerResponse ?? "").length}/500
                      </span>
                      <button
                        onClick={() => handleSubmitResponse(review.id)}
                        disabled={submittingId === review.id}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
                      >
                        {review.sellerResponse ? "Update Response" : "Post Response"}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";

interface Rating {
  id: string;
  jobId?: string;
  orderId?: string;
  courierUid?: string;
  courierName?: string;
  sellerId?: string;
  sellerName?: string;
  itemName?: string;
  rating?: number;
  itemRating?: number;
  sellerRating?: number;
  averageRating?: number;
  review: string | null;
  sellerResponse?: string | null;
  sellerResponseAt?: any;
  type: "delivery" | "marketplace";
  createdAt: any;
}

export default function MyReviewsPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const [reviews, setReviews] = useState<Rating[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "ratings"),
      where("customerId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ratingData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Rating[];
        setReviews(ratingData);
        setLoadingReviews(false);
      },
      (error) => {
        console.error("Error fetching reviews:", error);
        setLoadingReviews(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  const filteredReviews =
    filterType === "all"
      ? reviews
      : reviews.filter((r) => r.type === filterType);

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    try {
      await deleteDoc(doc(db, "ratings", reviewId));
    } catch (error) {
      console.error("Error deleting review:", error);
      alert("Failed to delete review. Please try again.");
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "—";
    const date =
      timestamp.toDate?.() || new Date(timestamp.seconds * 1000);
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

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Reviews</h1>
            <p className="text-sm text-gray-600 mt-1">
              Your ratings and reviews for deliveries and orders
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-sm font-semibold text-purple-600 hover:text-purple-700"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Filter Tabs */}
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex gap-2 overflow-x-auto">
              {[
                { label: "All Reviews", value: "all" },
                { label: "Deliveries", value: "delivery" },
                { label: "Marketplace", value: "marketplace" },
              ].map((filter) => (
                <button
                  key={filter.value}
                  onClick={() => setFilterType(filter.value)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                    filterType === filter.value
                      ? "bg-purple-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {filter.label}
                  {filter.value !== "all" && (
                    <span className="ml-2">
                      ({reviews.filter((r) => r.type === filter.value).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
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
                {reviews.filter((r) => r.type === "delivery").length}
              </div>
              <div className="text-xs text-gray-600">Delivery Reviews</div>
            </CardContent>
          </Card>
          <Card variant="elevated">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {reviews.filter((r) => r.type === "marketplace").length}
              </div>
              <div className="text-xs text-gray-600">Order Reviews</div>
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
        ) : filteredReviews.length === 0 ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-5xl mb-4">⭐</div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  {filterType === "all"
                    ? "No reviews yet"
                    : `No ${filterType} reviews yet`}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {filterType === "all"
                    ? "After completing a delivery or order, you can leave a review to help others."
                    : "Try selecting a different filter to see more reviews."}
                </p>
                {filterType === "all" && (
                  <Link
                    to="/jobs"
                    className="inline-flex px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700"
                  >
                    View My Jobs
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <Card key={review.id} variant="elevated">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">
                          {review.type === "delivery" ? "🚚" : "🛍️"}
                        </span>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {review.type === "delivery"
                              ? `Delivery with ${review.courierName || "Courier"}`
                              : review.itemName || "Marketplace Order"}
                          </h3>
                          {review.type === "marketplace" && review.sellerName && (
                            <p className="text-sm text-gray-600">
                              from {review.sellerName}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="text-sm text-red-600 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                  </div>

                  {/* Ratings */}
                  {review.type === "delivery" && review.rating && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2">
                        {renderStars(review.rating)}
                        <span className="text-sm text-gray-600">
                          {review.rating} out of 5
                        </span>
                      </div>
                    </div>
                  )}

                  {review.type === "marketplace" && (
                    <div className="mb-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Item Quality:
                        </span>
                        <div className="flex items-center gap-2">
                          {renderStars(review.itemRating || 0)}
                          <span className="text-sm text-gray-600">
                            {review.itemRating}/5
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Seller Service:
                        </span>
                        <div className="flex items-center gap-2">
                          {renderStars(review.sellerRating || 0)}
                          <span className="text-sm text-gray-600">
                            {review.sellerRating}/5
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Review Text */}
                  {review.review && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-sm text-gray-700">{review.review}</p>
                    </div>
                  )}

                  {review.sellerResponse && (
                    <div className="bg-purple-50 border border-purple-100 rounded-lg p-3 mb-3">
                      <p className="text-sm text-purple-900">
                        <span className="font-semibold">Seller response:</span> {review.sellerResponse}
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Reviewed on {formatDate(review.createdAt)}</span>
                    {review.type === "delivery" && review.jobId && (
                      <Link
                        to={`/jobs/${review.jobId}`}
                        className="text-purple-600 hover:text-purple-700 font-medium"
                      >
                        View Job →
                      </Link>
                    )}
                    {review.type === "marketplace" && review.orderId && (
                      <Link
                        to={`/orders/${review.orderId}`}
                        className="text-purple-600 hover:text-purple-700 font-medium"
                      >
                        View Order →
                      </Link>
                    )}
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

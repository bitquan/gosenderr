"use client";

import { useState } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

interface RateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  itemId: string;
  itemName: string;
  sellerId: string;
  sellerName: string;
  customerId: string;
}

export function RateOrderModal({
  isOpen,
  onClose,
  orderId,
  itemId,
  itemName,
  sellerId,
  sellerName,
  customerId,
}: RateOrderModalProps) {
  const [itemRating, setItemRating] = useState(0);
  const [sellerRating, setSellerRating] = useState(0);
  const [hoverItemRating, setHoverItemRating] = useState(0);
  const [hoverSellerRating, setHoverSellerRating] = useState(0);
  const [review, setReview] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (itemRating === 0 || sellerRating === 0) {
      alert("Please provide both item and seller ratings");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create rating document
      const ratingId = `${orderId}_${customerId}`;
      await setDoc(doc(db, "ratings", ratingId), {
        orderId,
        itemId,
        itemName,
        sellerId,
        sellerName,
        customerId,
        itemRating,
        sellerRating,
        averageRating: (itemRating + sellerRating) / 2,
        review: review.trim() || null,
        type: "marketplace",
        createdAt: serverTimestamp(),
      });

      alert("Thank you for your feedback!");
      onClose();
    } catch (error) {
      console.error("Error submitting rating:", error);
      alert("Failed to submit rating. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setItemRating(0);
      setSellerRating(0);
      setHoverItemRating(0);
      setHoverSellerRating(0);
      setReview("");
      onClose();
    }
  };

  const renderStars = (
    rating: number,
    hoverRating: number,
    setRating: (r: number) => void,
    setHoverRating: (r: number) => void
  ) => {
    return (
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            disabled={isSubmitting}
            className="text-4xl transition-transform hover:scale-110 disabled:opacity-50"
          >
            {star <= (hoverRating || rating) ? (
              <span className="text-yellow-400">⭐</span>
            ) : (
              <span className="text-gray-300">☆</span>
            )}
          </button>
        ))}
      </div>
    );
  };

  const getRatingLabel = (rating: number) => {
    if (rating === 0) return "";
    if (rating === 1) return "Poor";
    if (rating === 2) return "Fair";
    if (rating === 3) return "Good";
    if (rating === 4) return "Very Good";
    return "Excellent";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Rate Your Order</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Item Info */}
          <div className="mb-6 text-center">
            <p className="text-sm text-gray-600 mb-2">
              How was your experience with
            </p>
            <p className="font-semibold text-gray-900">{itemName}?</p>
            <p className="text-xs text-gray-500 mt-1">from {sellerName}</p>
          </div>

          {/* Item Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              Item Quality
            </label>
            {renderStars(
              itemRating,
              hoverItemRating,
              setItemRating,
              setHoverItemRating
            )}
            {itemRating > 0 && (
              <p className="text-center mt-2 text-sm font-medium text-gray-700">
                {getRatingLabel(itemRating)}
              </p>
            )}
          </div>

          {/* Seller Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3 text-center">
              Seller Service
            </label>
            {renderStars(
              sellerRating,
              hoverSellerRating,
              setSellerRating,
              setHoverSellerRating
            )}
            {sellerRating > 0 && (
              <p className="text-center mt-2 text-sm font-medium text-gray-700">
                {getRatingLabel(sellerRating)}
              </p>
            )}
          </div>

          {/* Written Review */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Review (Optional)
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              disabled={isSubmitting}
              placeholder="Share your experience with other shoppers..."
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50 disabled:bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {review.length}/500 characters
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting || itemRating === 0 || sellerRating === 0
              }
              className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Submit Rating"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

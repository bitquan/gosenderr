
import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/firestore";

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  customerUid: string;
  customerName: string;
}

const DISPUTE_REASONS = [
  "Item not delivered",
  "Item delivered to wrong address",
  "Item damaged or missing",
  "Courier was unprofessional",
  "Delivery took too long",
  "Incorrect charges",
  "Other",
];

export function DisputeModal({
  isOpen,
  onClose,
  jobId,
  customerUid,
  customerName,
}: DisputeModalProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason) {
      alert("Please select a reason for the dispute");
      return;
    }

    if (description.trim().length < 20) {
      alert("Please provide more details (at least 20 characters)");
      return;
    }

    setIsSubmitting(true);
    try {
      // Create dispute document
      await addDoc(collection(db, "disputes"), {
        jobId,
        customerUid,
        customerName,
        reason,
        description: description.trim(),
        status: "open",
        type: "delivery",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      alert("Dispute submitted successfully. Our team will review it shortly.");
      handleClose();
    } catch (error) {
      console.error("Error submitting dispute:", error);
      alert("Failed to submit dispute. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason("");
      setDescription("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">File a Dispute</h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none disabled:opacity-50"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Info Banner */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-3">
              <span className="text-2xl">ℹ️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-1">
                  How disputes work
                </h3>
                <p className="text-sm text-blue-700">
                  Our team will review your case within 24-48 hours and contact
                  you with a resolution. Please provide as much detail as
                  possible.
                </p>
              </div>
            </div>
          </div>

          {/* Job ID */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Job ID</div>
            <div className="font-mono text-sm text-gray-900">{jobId}</div>
          </div>

          {/* Reason Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Dispute <span className="text-red-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-50"
            >
              <option value="">Select a reason...</option>
              {DISPUTE_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Describe the Issue <span className="text-red-500">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              placeholder="Please provide as much detail as possible about what went wrong..."
              rows={6}
              maxLength={1000}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none disabled:opacity-50 disabled:bg-gray-50"
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-500">Minimum 20 characters</p>
              <p className="text-xs text-gray-500">
                {description.length}/1000 characters
              </p>
            </div>
          </div>

          {/* Photo Upload Placeholder */}
          <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
            <div className="text-3xl mb-2">📷</div>
            <p className="text-sm text-gray-600 mb-1">
              Photo evidence (coming soon)
            </p>
            <p className="text-xs text-gray-500">
              Upload photos to support your claim
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting || !reason || description.trim().length < 20
              }
              className="flex-1 bg-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Submitting..." : "Submit Dispute"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

interface RunnerRejectModalProps {
  jobId: string;
  runnerId: string;
  onClose: () => void;
  onSubmit: () => void;
}

const REJECTION_REASONS = [
  { id: "too-far", label: "🚗 Too far from my location", penalty: false },
  { id: "vehicle-issue", label: "🔧 Vehicle issue or maintenance", penalty: false },
  { id: "schedule-conflict", label: "📅 Schedule conflict", penalty: false },
  { id: "package-too-large", label: "📦 Package too large for my vehicle", penalty: false },
  { id: "unsafe-area", label: "⚠️ Safety concerns about delivery area", penalty: false },
  { id: "weather", label: "🌧️ Weather conditions", penalty: false },
  { id: "personal-emergency", label: "🚨 Personal emergency", penalty: false },
  { id: "other", label: "📝 Other reason", penalty: false },
];

export default function RunnerRejectModal({
  jobId,
  runnerId,
  onClose,
  onSubmit,
}: RunnerRejectModalProps) {
  const [selectedReason, setSelectedReason] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!selectedReason) {
      setError("Please select a reason for rejection");
      return;
    }

    if (selectedReason === "other" && !notes.trim()) {
      setError("Please provide details for 'Other' reason");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const jobRef = doc(db, "jobs", jobId);

      // Update job status to rejected_by_runner
      await updateDoc(jobRef, {
        status: "pending", // Back to pending so another runner can take it
        rejectedBy: runnerId,
        rejectedAt: serverTimestamp(),
        rejectionReason: REJECTION_REASONS.find((r) => r.id === selectedReason)?.label,
        rejectionNotes: notes,
        updatedAt: serverTimestamp(),
      });

      // Log rejection event
      await addDoc(collection(db, "jobEvents"), {
        jobId,
        runnerId,
        eventType: "rejection",
        reason: selectedReason,
        notes,
        timestamp: serverTimestamp(),
      });

      onSubmit();
      onClose();
    } catch (err: any) {
      console.error("Error rejecting job:", err);
      setError(err.message || "Failed to reject job");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <h2 className="text-2xl font-bold text-gray-900">Reject Job</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Warning Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-semibold text-amber-900 mb-1">
                Before you reject
              </h3>
              <p className="text-sm text-amber-800">
                Frequent rejections may affect your job quality and availability.
                Your first rejection won't impact your rating.
              </p>
            </div>
          </div>

          {/* Rejection Reasons */}
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Why are you rejecting this job? *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {REJECTION_REASONS.map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setSelectedReason(reason.id)}
                  className={`p-4 rounded-xl border-2 text-left transition ${
                    selectedReason === reason.id
                      ? "border-purple-600 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <div className="font-medium text-gray-900">
                    {reason.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Additional Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-900">
              Additional details{selectedReason === "other" ? " *" : " (optional)"}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide more context about your rejection..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-gray-500 text-right">
              {notes.length}/500 characters
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
              <span className="text-xl">❌</span>
              <p className="text-sm text-red-800 flex-1">{error}</p>
            </div>
          )}

          {/* Impact Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <span className="text-xl">ℹ️</span>
            <div className="flex-1 text-sm text-blue-900">
              <p className="font-semibold mb-1">What happens next?</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>This job will be available for other runners</li>
                <li>Your rejection count will be tracked</li>
                <li>Multiple rejections may limit access to premium jobs</li>
                <li>You can still accept other available jobs</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-3xl">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedReason || isSubmitting}
            className="flex-1 px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? "Rejecting..." : "Confirm Rejection"}
          </button>
        </div>
      </div>
    </div>
  );
}

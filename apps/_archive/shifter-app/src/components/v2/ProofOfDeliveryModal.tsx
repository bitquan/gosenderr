
import { useState, useRef } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

interface ProofOfDeliveryModalProps {
  jobId: string;
  runnerId?: string;
  onClose: () => void;
  onComplete: () => void;
}

export function ProofOfDeliveryModal({
  jobId,
  onClose,
  onComplete,
}: ProofOfDeliveryModalProps) {
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [selectedNote, setSelectedNote] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const predefinedNotes = [
    "Left at front door",
    "Handed to resident",
    "Left at mailbox",
    "Left with building security",
    "Left in garage",
    "Left at back door",
  ];

  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!photoFile) {
      alert("Please take a photo of the delivery");
      return;
    }

    setUploading(true);
    try {
      // Upload photo to Firebase Storage
      const storageRef = ref(
        storage,
        `proof-of-delivery/${jobId}/${Date.now()}_${photoFile.name}`,
      );
      await uploadBytes(storageRef, photoFile);
      const photoURL = await getDownloadURL(storageRef);

      // Update job with proof of delivery
      await updateDoc(doc(db, "jobs", jobId), {
        proofOfDelivery: {
          photoURL,
          notes: selectedNote || notes || "Delivery completed",
          timestamp: serverTimestamp(),
        },
        status: "delivered",
        deliveredAt: serverTimestamp(),
      });

      onComplete();
    } catch (error) {
      console.error("Error uploading proof of delivery:", error);
      alert("Failed to upload proof. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">
              Proof of Delivery
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-gray-100 transition"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Photo Capture */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Photo *
              </label>
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Delivery proof"
                    className="w-full h-64 object-cover rounded-xl"
                  />
                  <button
                    onClick={() => {
                      setPhotoPreview(null);
                      setPhotoFile(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100"
                  >
                    🗑️
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-64 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center hover:border-purple-500 hover:bg-purple-50 transition"
                >
                  <span className="text-6xl mb-2">📸</span>
                  <span className="text-sm font-medium text-gray-700">
                    Take Photo
                  </span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
            </div>

            {/* Predefined Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Location
              </label>
              <div className="grid grid-cols-2 gap-2">
                {predefinedNotes.map((note) => (
                  <button
                    key={note}
                    onClick={() => setSelectedNote(note)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                      selectedNote === note
                        ? "bg-purple-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {note}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special delivery instructions..."
                rows={3}
                maxLength={200}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                {notes.length}/200 characters
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={uploading || !photoFile}
              className="flex-1 px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "Uploading..." : "Complete Delivery"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useUserDoc } from "@/hooks/v2/useUserDoc";
import { Card, CardContent } from "@/components/ui/Card";

export default function NewVendorItem() {
  const navigate = useNavigate();
  const { uid } = useAuthUser();
  const { userDoc } = useUserDoc();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "package",
    weight: "",
    dimensions: "",
    status: "active" as "active" | "draft",
  });

  const categories = [
    { value: "package", label: "📦 Package" },
    { value: "food", label: "🍔 Food" },
    { value: "document", label: "📄 Document" },
    { value: "other", label: "📌 Other" },
  ];

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 5); // Max 5 images
      setImages(files);
    }
  };

  const uploadImages = async (): Promise<string[]> => {
    const imageUrls: string[] = [];

    for (const image of images) {
      const storageRef = ref(
        storage,
        `marketplace/${uid}/${Date.now()}_${image.name}`
      );
      await uploadBytes(storageRef, image);
      const url = await getDownloadURL(storageRef);
      imageUrls.push(url);
    }

    return imageUrls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    setLoading(true);
    try {
      // Upload images
      const imageUrls = await uploadImages();

      // Create item
      await addDoc(collection(db, "marketplaceItems"), {
        ...formData,
        price: parseFloat(formData.price),
        weight: formData.weight ? parseFloat(formData.weight) : null,
        images: imageUrls,
        vendorId: uid,
        vendorName: userDoc?.displayName || "Vendor",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      navigate("/vendor/dashboard");
    } catch (error) {
      console.error("Failed to create item:", error);
      alert("Failed to create item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-6">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate("/vendor/dashboard")}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors"
          >
            <span className="text-xl">←</span>
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold mb-2">Create New Item</h1>
          <p className="text-blue-100">List a new item on the marketplace</p>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Images (Max 5)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                {images.length > 0 && (
                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {images.map((img, idx) => (
                      <img
                        key={idx}
                        src={URL.createObjectURL(img)}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-20 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Item name"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="Describe your item"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Price ($) *
                </label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weight (lbs)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.weight}
                  onChange={(e) =>
                    setFormData({ ...formData, weight: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="0.00"
                />
              </div>

              {/* Dimensions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dimensions (L x W x H inches)
                </label>
                <input
                  type="text"
                  value={formData.dimensions}
                  onChange={(e) =>
                    setFormData({ ...formData, dimensions: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="12 x 8 x 4"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={formData.status === "active"}
                      onChange={() =>
                        setFormData({ ...formData, status: "active" })
                      }
                      className="text-purple-600 focus:ring-purple-600"
                    />
                    <span>Active (Visible on marketplace)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={formData.status === "draft"}
                      onChange={() =>
                        setFormData({ ...formData, status: "draft" })
                      }
                      className="text-purple-600 focus:ring-purple-600"
                    />
                    <span>Draft (Hidden)</span>
                  </label>
                </div>
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate("/vendor/dashboard")}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Item"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

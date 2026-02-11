import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { marketplaceService } from "@/services/marketplace.service";
import { DeliveryOption, ItemCategory, ItemCondition } from "@/types/marketplace";
import { Card, CardContent } from "@/components/ui/Card";
import { AddressAutocomplete } from "@/components/v2/AddressAutocomplete";
import { doc, getDoc, GeoPoint } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { parseUsAddressComponents } from "@/lib/pickupPrivacy";

type PickupLocationState = {
  address: string;
  city: string;
  state: string;
  postalCode?: string;
  lat: number;
  lng: number;
};

const toPickupLocationState = (value: any): PickupLocationState | null => {
  if (!value) return null;
  const location = value.location || value;
  const lat = location?.latitude ?? location?.lat;
  const lng = location?.longitude ?? location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  return {
    address: value.address || "",
    city: value.city || "",
    state: value.state || "",
    postalCode: value.postalCode || "",
    lat,
    lng,
  };
};

const getSellerDefaultPickupLocation = (userData: any): PickupLocationState | null => {
  const defaultPickup = toPickupLocationState(userData?.sellerProfile?.defaultPickupLocation);
  if (defaultPickup) return defaultPickup;

  const localConfig = userData?.sellerProfile?.localSellingConfig;
  const localConfigPickup = toPickupLocationState(localConfig?.pickupLocation);
  if (localConfigPickup) return localConfigPickup;

  const localConfigWithLocation = toPickupLocationState({
    address: localConfig?.address || "",
    city: localConfig?.city || "",
    state: localConfig?.state || "",
    postalCode: localConfig?.postalCode || "",
    location: localConfig?.location,
  });
  if (localConfigWithLocation) return localConfigWithLocation;

  return null;
};

export default function NewSellerItem() {
  const navigate = useNavigate();
  const { uid } = useAuthUser();
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [pickupLocation, setPickupLocation] = useState<PickupLocationState | null>(null);
  const [sellerStatus, setSellerStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const [sellerRejectionReason, setSellerRejectionReason] = useState<string | null>(null);
  const [sellerStatusLoading, setSellerStatusLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "other" as ItemCategory,
    condition: "new" as ItemCondition,
    quantity: "1",
    weight: "",
    dimensions: "",
    deliveryOptions: ["courier"] as DeliveryOption[],
  });

  const toSafeBlobUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "blob:" ? parsed.href : null;
    } catch {
      return null;
    }
  };

  const categories = [
    { value: "electronics", label: "📱 Electronics" },
    { value: "clothing", label: "👕 Clothing" },
    { value: "home", label: "🏠 Home" },
    { value: "books", label: "📚 Books" },
    { value: "toys", label: "🧸 Toys" },
    { value: "sports", label: "🏈 Sports" },
    { value: "automotive", label: "🚗 Automotive" },
    { value: "other", label: "📌 Other" },
  ];

  const conditions = [
    { value: "new", label: "New" },
    { value: "like_new", label: "Like New" },
    { value: "good", label: "Good" },
    { value: "fair", label: "Fair" },
    { value: "poor", label: "Poor" },
  ];

  const deliveryOptions = [
    { value: "courier" as DeliveryOption, label: "Courier Delivery" },
    { value: "pickup" as DeliveryOption, label: "Pickup" },
    { value: "shipping" as DeliveryOption, label: "Shipping" },
  ];

  const parseAddressParts = (address: string) => {
    const parts = address
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const parsed = parseUsAddressComponents(address);
    return {
      street: parts[0] || address,
      city: parsed.city,
      state: parsed.state,
      postalCode: parsed.zipCode,
    };
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).slice(0, 5); // Max 5 images
      setImages(files);
    }
  };

  useEffect(() => {
    if (images.length === 0) {
      setPreviewUrls([]);
      return;
    }

    const urls = images.map((image) => URL.createObjectURL(image));
    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [images]);

  useEffect(() => {
    const loadSellerStatus = async () => {
      if (!uid) {
        setSellerStatusLoading(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", uid));
        const userData = userSnap.data();
        const defaultPickupLocation = getSellerDefaultPickupLocation(userData);
        if (defaultPickupLocation) {
          setPickupLocation((current) => current ?? defaultPickupLocation);
        }
        const roles = Array.isArray(userData?.roles) ? userData.roles : [];
        const hasSellerRole = userData?.role === "seller" || roles.includes("seller");

        if (hasSellerRole || userData?.sellerApplication?.status === "approved") {
          setSellerStatus("approved");
          setSellerRejectionReason(null);
        } else if (userData?.sellerApplication?.status === "pending") {
          setSellerStatus("pending");
          setSellerRejectionReason(null);
        } else if (userData?.sellerApplication?.status === "rejected") {
          setSellerStatus("rejected");
          setSellerRejectionReason(userData?.sellerApplication?.rejectionReason || null);
        } else {
          setSellerStatus("none");
          setSellerRejectionReason(null);
        }
      } catch (error) {
        console.error("Failed to load seller status:", error);
      } finally {
        setSellerStatusLoading(false);
      }
    };

    loadSellerStatus();
  }, [uid]);

  const uploadImages = async (): Promise<string[]> => {
    const imageUrls: string[] = [];

    for (const image of images) {
      if (!uid) throw new Error("Missing user ID");
      const storageRef = ref(
        storage,
        `items/${uid}/${Date.now()}_${image.name}`
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

    if (sellerStatus !== "approved") {
      alert("Your seller application must be approved before creating listings.");
      return;
    }

    const needsPickupLocation = formData.deliveryOptions.some(
      (option) => option === "courier" || option === "pickup",
    );
    if (needsPickupLocation && !pickupLocation) {
      alert("Please add a pickup location for courier or pickup delivery.");
      return;
    }

    setLoading(true);
    try {
      // Upload images
      const imageUrls = await uploadImages();

      const deliveryOptions = formData.deliveryOptions.length > 0
        ? formData.deliveryOptions
        : ["courier" as DeliveryOption];

      await marketplaceService.createListing({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
        price: parseFloat(formData.price),
        quantity: Math.max(1, parseInt(formData.quantity || "1", 10)),
        photos: imageUrls,
        deliveryOptions,
        pickupLocation: pickupLocation
          ? {
              address: pickupLocation.address,
              city: pickupLocation.city,
              state: pickupLocation.state,
              postalCode: pickupLocation.postalCode || "",
              location: new GeoPoint(pickupLocation.lat, pickupLocation.lng),
            }
          : undefined,
      });

      navigate('/seller/dashboard');
    } catch (error) {
      console.error("Failed to create item:", error);
      alert("Failed to create item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (sellerStatusLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 flex items-center justify-center">
        <div className="text-gray-600">Checking seller status...</div>
      </div>
    );
  }

  if (sellerStatus !== "approved") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 flex items-center justify-center p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-5xl mb-4">🏪</div>
            {sellerStatus === "pending" && (
              <>
                <h2 className="text-2xl font-bold mb-2">Seller Application Pending</h2>
                <p className="text-gray-600">Your application is under review.</p>
              </>
            )}
            {sellerStatus === "rejected" && (
              <>
                <h2 className="text-2xl font-bold mb-2">Application Rejected</h2>
                <p className="text-gray-600 mb-4">
                  {sellerRejectionReason || "Your application was not approved. Please resubmit."}
                </p>
                <button
                  onClick={() => navigate("/seller/apply")}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-semibold"
                >
                  Resubmit Application
                </button>
              </>
            )}
            {sellerStatus === "none" && (
              <>
                <h2 className="text-2xl font-bold mb-2">Apply to Become a Seller</h2>
                <p className="text-gray-600 mb-4">Complete the seller application to list items.</p>
                <button
                  onClick={() => navigate("/seller/apply")}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold"
                >
                  Apply Now
                </button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-6">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate("/seller/dashboard")}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors"
          >
            <span className="text-xl">←</span>
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-3xl font-bold mb-2">Create New Listing</h1>
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
                {previewUrls.length > 0 && (
                  <div className="mt-4 grid grid-cols-5 gap-2">
                    {previewUrls.map((url, idx) => {
                      const safeUrl = toSafeBlobUrl(url);
                      return safeUrl ? (
                        <img
                          key={safeUrl}
                          src={safeUrl}
                          alt={`Preview ${idx + 1}`}
                          className="w-full h-20 object-cover rounded-lg"
                        />
                      ) : null;
                    })}
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
                    setFormData({ ...formData, category: e.target.value as ItemCategory })
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

              {/* Condition */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Condition *
                </label>
                <select
                  required
                  value={formData.condition}
                  onChange={(e) =>
                    setFormData({ ...formData, condition: e.target.value as ItemCondition })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                >
                  {conditions.map((cond) => (
                    <option key={cond.value} value={cond.value}>
                      {cond.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                  placeholder="1"
                />
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

              {/* Delivery Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Delivery Options *
                </label>
                <div className="space-y-2">
                  {deliveryOptions.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.deliveryOptions.includes(option.value)}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...formData.deliveryOptions, option.value]
                            : formData.deliveryOptions.filter((value) => value !== option.value);
                          setFormData({ ...formData, deliveryOptions: next });
                        }}
                        className="h-4 w-4 text-purple-600 border-gray-300 rounded"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Location
                </label>
                <AddressAutocomplete
                  label="Pickup Address"
                  placeholder="Enter pickup address..."
                  onSelect={(result) => {
                    const parsed = parseAddressParts(result.address);
                    setPickupLocation({
                      address: result.address,
                      city: parsed.city,
                      state: parsed.state,
                      postalCode: parsed.postalCode,
                      lat: result.lat,
                      lng: result.lng,
                    });
                  }}
                  required={formData.deliveryOptions.some(
                    (option) => option === "courier" || option === "pickup",
                  )}
                />
                {pickupLocation && (
                  <div className="mt-3 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    <div className="font-semibold">Pickup location set</div>
                    <div>{pickupLocation.address}</div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate("/seller/dashboard")}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? "Creating..." : "Create Listing"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

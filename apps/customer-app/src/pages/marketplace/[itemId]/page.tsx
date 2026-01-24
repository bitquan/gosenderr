import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getItem, Item } from "@/lib/v2/items";
import type { UserDoc } from "@/lib/v2/types";
import { Card, CardContent } from "@/components/ui/Card";

const CATEGORY_LABELS: Record<string, string> = {
  furniture: "Furniture",
  electronics: "Electronics",
  clothing: "Clothing",
  food: "Food",
  other: "Other",
};

const CONDITION_LABELS: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

export default function MarketplaceItemPage() {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [seller, setSeller] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);

  useEffect(() => {
    let active = true;

    const loadItem = async () => {
      if (!itemId) {
        navigate("/marketplace");
        return;
      }

      setLoading(true);
      try {
        const data = await getItem(itemId);
        if (!data) {
          navigate("/marketplace");
          return;
        }

        if (!active) return;
        setItem(data);

        if (data.sellerId) {
          const sellerRef = doc(db, "users", data.sellerId);
          const sellerSnap = await getDoc(sellerRef);
          if (sellerSnap.exists() && active) {
            setSeller(sellerSnap.data() as UserDoc);
          }
        }
      } catch (error) {
        console.error("Failed to load item:", error);
        if (active) {
          navigate("/marketplace");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadItem();
    return () => {
      active = false;
    };
  }, [itemId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!item) {
    return null;
  }

  const photos = item.photos || [];
  const activePhoto = photos[selectedPhotoIndex];

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/marketplace" className="text-sm font-semibold text-purple-600">
            ← Back to Marketplace
          </Link>
          <span className="text-xs text-gray-500">
            {CATEGORY_LABELS[item.category] || item.category}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card variant="elevated">
            <CardContent className="space-y-4">
              <div className="aspect-square rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center">
                {activePhoto ? (
                  <img
                    src={activePhoto}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-sm">No photo</span>
                )}
              </div>
              {photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {photos.map((photo, index) => (
                    <button
                      key={photo}
                      onClick={() => setSelectedPhotoIndex(index)}
                      className={`h-16 w-16 rounded-lg overflow-hidden border ${
                        index === selectedPhotoIndex
                          ? "border-purple-500"
                          : "border-transparent"
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`${item.title} ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="space-y-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
                <p className="text-sm text-gray-500">{CONDITION_LABELS[item.condition] || item.condition}</p>
              </div>

              <p className="text-2xl font-bold text-purple-600">${item.price.toFixed(2)}</p>

              <p className="text-sm text-gray-600">{item.description}</p>

              {seller && (
                <div className="rounded-xl border border-gray-100 p-4">
                  <p className="text-xs text-gray-500">Seller</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {seller.displayName || seller.email || "Seller"}
                  </p>
                </div>
              )}

              <button
                onClick={() => navigate(`/request-delivery?itemId=${item.id}`)}
                className="w-full rounded-xl bg-purple-600 px-4 py-3 text-white font-semibold hover:bg-purple-700 transition"
              >
                Request delivery
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
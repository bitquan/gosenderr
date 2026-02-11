import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { marketplaceService } from "@/services/marketplace.service";
import { ItemCategory } from "@/types/marketplace";
import type { MarketplaceItem } from "@/types/marketplace";
import { ItemCard } from "@/components/marketplace/ItemCard";
import { Card, CardContent } from "@/components/ui/Card";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

const CATEGORIES: Array<{ value: ItemCategory | "all"; label: string }> = [
  { value: "all", label: "All Items" },
  { value: ItemCategory.ELECTRONICS, label: "Electronics" },
  { value: ItemCategory.CLOTHING, label: "Clothing" },
  { value: ItemCategory.HOME, label: "Home" },
  { value: ItemCategory.BOOKS, label: "Books" },
  { value: ItemCategory.TOYS, label: "Toys" },
  { value: ItemCategory.SPORTS, label: "Sports" },
  { value: ItemCategory.AUTOMOTIVE, label: "Automotive" },
  { value: ItemCategory.OTHER, label: "Other" },
];

export default function MarketplacePage() {
  const { uid } = useAuthUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | "all">("all");
  const [customerAddressSet, setCustomerAddressSet] = useState(false);
  const [customerLocation, setCustomerLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const initialCategory = searchParams.get("category") as ItemCategory | null;
    if (initialCategory && initialCategory !== selectedCategory) {
      setSelectedCategory(initialCategory);
    }
  }, [searchParams, selectedCategory]);

  useEffect(() => {
    let active = true;

    const loadItems = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await marketplaceService.getItems({
          category: selectedCategory === "all" ? undefined : selectedCategory,
          limit: 100,
        });
        if (active) {
          setItems(data);
        }
      } catch (err) {
        console.error("Failed to load marketplace items:", err);
        if (active) {
          setError("Unable to load items. Please try again.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadItems();
    return () => {
      active = false;
    };
  }, [selectedCategory]);

  useEffect(() => {
    let active = true;

    const loadCustomerAddress = async () => {
      if (!uid) {
        setCustomerAddressSet(false);
        setCustomerLocation(null);
        return;
      }

      try {
        const savedAddressesQuery = query(
          collection(db, "savedAddresses"),
          where("userId", "==", uid),
        );
        const snapshot = await getDocs(savedAddressesQuery);
        const docs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as {
            isDefault?: boolean;
            lat?: number;
            lng?: number;
          }),
        }));

        const defaultAddress = docs.find((addr) => addr.isDefault) || docs[0];
        const hasCoordinates =
          typeof defaultAddress?.lat === "number" &&
          typeof defaultAddress?.lng === "number";

        if (!active) return;
        setCustomerAddressSet(Boolean(defaultAddress));
        setCustomerLocation(
          hasCoordinates
            ? { lat: defaultAddress.lat as number, lng: defaultAddress.lng as number }
            : null,
        );
      } catch (loadError) {
        console.error("Failed to load saved addresses for marketplace:", loadError);
        if (!active) return;
        setCustomerAddressSet(false);
        setCustomerLocation(null);
      }
    };

    loadCustomerAddress();
    return () => {
      active = false;
    };
  }, [uid]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description ?? "").toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, searchQuery, selectedCategory]);

  const handleCategoryChange = (category: ItemCategory | "all") => {
    setSelectedCategory(category);
    if (category === "all") {
      searchParams.delete("category");
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ category }, { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-purple-100 text-sm">Browse items and request delivery</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-8">
        <Card variant="elevated" className="mb-6">
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700">Search</label>
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search items by name or description"
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700">Category</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category.value}
                    onClick={() => handleCategoryChange(category.value)}
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      selectedCategory === category.value
                        ? "bg-purple-600 text-white"
                        : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                    }`}
                  >
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-48 bg-white rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <Card variant="elevated">
            <CardContent className="text-center py-10">
              <p className="text-sm text-gray-600">{error}</p>
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="text-center py-10">
              <p className="text-sm text-gray-600">No items found.</p>
              <Link
                to="/jobs/new"
                className="mt-4 inline-flex text-sm font-semibold text-purple-600"
              >
                Request a custom delivery instead
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                customerAddressSet={customerAddressSet}
                customerLocation={customerLocation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

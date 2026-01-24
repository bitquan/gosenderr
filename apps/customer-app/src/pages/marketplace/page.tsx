import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getAvailableItems, Item } from "@/lib/v2/items";
import type { ItemCategory } from "@/lib/v2/types";
import { ItemCard } from "@/features/marketplace/ItemCard";
import { Card, CardContent } from "@/components/ui/Card";

const CATEGORIES: Array<{ value: ItemCategory | "all"; label: string }> = [
  { value: "all", label: "All Items" },
  { value: "furniture", label: "Furniture" },
  { value: "electronics", label: "Electronics" },
  { value: "clothing", label: "Clothing" },
  { value: "food", label: "Food" },
  { value: "other", label: "Other" },
];

export default function MarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | "all">("all");

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
        const data = await getAvailableItems();
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
  }, []);

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
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
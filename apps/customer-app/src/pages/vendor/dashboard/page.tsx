import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface Item {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  vendorId: string;
  vendorName: string;
  status: "active" | "sold" | "draft";
  createdAt: any;
}

export default function VendorDashboard() {
  const { uid } = useAuthUser();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalItems: 0,
    activeListings: 0,
    soldItems: 0,
    totalRevenue: 0,
  });

  useEffect(() => {
    if (!uid) return;
    loadVendorItems();
  }, [uid]);

  const loadVendorItems = async () => {
    try {
      const itemsQuery = query(
        collection(db, "items"),
        where("vendorId", "==", uid)
      );
      const snapshot = await getDocs(itemsQuery);
      const itemsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Item[];

      setItems(itemsList);

      // Calculate stats
      const active = itemsList.filter((i) => i.status === "active").length;
      const sold = itemsList.filter((i) => i.status === "sold").length;
      const revenue = itemsList
        .filter((i) => i.status === "sold")
        .reduce((sum, i) => sum + i.price, 0);

      setStats({
        totalItems: itemsList.length,
        activeListings: active,
        soldItems: sold,
        totalRevenue: revenue,
      });
    } catch (error) {
      console.error("Failed to load vendor items:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await deleteDoc(doc(db, "items", itemId));
      setItems(items.filter((i) => i.id !== itemId));
    } catch (error) {
      console.error("Failed to delete item:", error);
      alert("Failed to delete item");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Vendor Dashboard</h1>
              <p className="text-blue-100">Manage your marketplace listings</p>
            </div>
            <Link
              to="/vendor/items/new"
              className="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              + New Item
            </Link>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold">{stats.totalItems}</div>
              <div className="text-blue-100 text-sm">Total Items</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold">{stats.activeListings}</div>
              <div className="text-blue-100 text-sm">Active</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold">{stats.soldItems}</div>
              <div className="text-blue-100 text-sm">Sold</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold">${stats.totalRevenue}</div>
              <div className="text-blue-100 text-sm">Revenue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        {items.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">🏪</div>
              <h2 className="text-2xl font-bold mb-2">No items yet</h2>
              <p className="text-gray-600 mb-6">
                Start selling by creating your first marketplace item
              </p>
              <Link
                to="/vendor/items/new"
                className="inline-block px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                Create First Item
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="p-4">
                  {item.images?.[0] && (
                    <img
                      src={item.images[0]}
                      alt={item.title}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                    />
                  )}
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-lg flex-1">{item.title}</h3>
                    <Badge
                      variant={
                        item.status === "active"
                          ? "success"
                          : item.status === "sold"
                            ? "default"
                            : "warning"
                      }
                    >
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-purple-600">
                      ${item.price}
                    </span>
                    <div className="flex gap-2">
                      <Link
                        to={`/vendor/items/${item.id}/edit`}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1 text-sm bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
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

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, query, where, getDocs, deleteDoc, doc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SalesChart } from "@/components/vendor/SalesChart";

interface Item {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  vendorId: string;
  vendorName: string;
  stock: number;
  status: "active" | "sold" | "draft";
  createdAt: any;
}

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

export default function VendorDashboard() {
  const { uid } = useAuthUser();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    activeListings: 0,
    soldItems: 0,
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
  });

  useEffect(() => {
    if (!uid) return;
    loadVendorItems();
  }, [uid]);

  const loadVendorItems = async () => {
    try {
      const itemsQuery = query(
        collection(db, "marketplaceItems"),
        where("vendorId", "==", uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(itemsQuery);
      const itemsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Item[];

      setItems(itemsList);

      // Calculate stats
      const activeListings = itemsList.filter((item) => item.status === "active").length;
      const soldItems = itemsList.filter((item) => item.status === "sold").length;
      
      // Fetch vendor's orders for revenue calculation
      const ordersSnapshot = await getDocs(collection(db, "orders"));
      const vendorOrders = ordersSnapshot.docs.filter((doc) => {
        const orderData = doc.data();
        return orderData.items?.some((item: any) => item.vendorId === uid);
      });

      const totalRevenue = vendorOrders.reduce((sum, doc) => {
        const orderData = doc.data();
        const vendorItemsTotal = orderData.items
          ?.filter((item: any) => item.vendorId === uid)
          .reduce((itemSum: number, item: any) => itemSum + (item.price * item.quantity), 0) || 0;
        return sum + vendorItemsTotal;
      }, 0);

      // Calculate average order value
      const avgOrderValue = vendorOrders.length > 0 ? totalRevenue / vendorOrders.length : 0;

      // Identify low stock items (stock <= 5)
      const lowStock = itemsList.filter((item) => item.status === "active" && item.stock <= 5);
      setLowStockItems(lowStock);

      // Generate sales data for last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date;
      });

      const salesByDay = last7Days.map((date) => {
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayOrders = vendorOrders.filter((doc) => {
          const orderData = doc.data();
          const orderDate = orderData.createdAt?.toDate?.();
          return orderDate && orderDate.toDateString() === date.toDateString();
        });

        const dayRevenue = dayOrders.reduce((sum, doc) => {
          const orderData = doc.data();
          const vendorItemsTotal = orderData.items
            ?.filter((item: any) => item.vendorId === uid)
            .reduce((itemSum: number, item: any) => itemSum + (item.price * item.quantity), 0) || 0;
          return sum + vendorItemsTotal;
        }, 0);

        return {
          date: dateStr,
          revenue: dayRevenue,
          orders: dayOrders.length,
        };
      });

      setSalesData(salesByDay);

      setStats({
        totalItems: itemsList.length,
        activeListings,
        soldItems,
        totalRevenue,
        totalOrders: vendorOrders.length,
        avgOrderValue,
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
      await deleteDoc(doc(db, "marketplaceItems", itemId));
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
            <div className="flex space-x-3">
              <Link
                to="/vendor/orders"
                className="px-6 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-all"
              >
                View Orders
              </Link>
              <Link
                to="/vendor/items/new"
                className="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:shadow-lg transition-all"
              >
                + New Item
              </Link>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              <div className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</div>
              <div className="text-blue-100 text-sm">Revenue</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <div className="text-blue-100 text-sm">Orders</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold">${stats.avgOrderValue.toFixed(2)}</div>
              <div className="text-blue-100 text-sm">Avg Order</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Low Stock Alert */}
        {lowStockItems.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-r">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800">Low Stock Alert</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p className="mb-2">{lowStockItems.length} item(s) running low on stock:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {lowStockItems.slice(0, 3).map((item) => (
                      <li key={item.id}>
                        {item.title} - Only {item.stock} left
                        <Link to={`/vendor/items/${item.id}/edit`} className="ml-2 underline">
                          Update
                        </Link>
                      </li>
                    ))}
                    {lowStockItems.length > 3 && (
                      <li className="text-yellow-600">
                        And {lowStockItems.length - 3} more items...
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sales Analytics Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Sales Overview (Last 7 Days)</h2>
          <SalesChart data={salesData} />
        </div>

        {/* Items List */}
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

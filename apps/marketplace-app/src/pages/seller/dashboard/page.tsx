import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SalesChart } from "@/components/seller/SalesChart";
import {
  buildSellerBookingLink,
  getBookingLinkEligibility,
} from "@/lib/sellerOnboarding";
import { trackSellerOnboardingEvent } from "@/lib/onboardingEvents";

interface Item {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  sellerId: string;
  sellerName: string;
  stock: number;
  status: "active" | "sold" | "draft";
  createdAt: any;
}

interface SalesData {
  date: string;
  revenue: number;
  orders: number;
}

interface SellerBookingLink {
  id: string;
  itemId: string;
  itemTitle: string;
  url: string;
  isActive: boolean;
  openCount: number;
  createdAt?: any;
  updatedAt?: any;
}

function createBookingLinkId() {
  return `sbl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatTimestamp(value: any): string {
  if (value?.toDate) {
    return value.toDate().toLocaleString();
  }
  if (typeof value === "string") {
    return value;
  }
  return "-";
}

export default function SellerDashboard() {
  const { uid } = useAuthUser();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [sellerUserData, setSellerUserData] = useState<Record<string, any> | null>(null);

  const [bookingLinks, setBookingLinks] = useState<SellerBookingLink[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [creatingBookingLink, setCreatingBookingLink] = useState(false);
  const [refreshingLinks, setRefreshingLinks] = useState(false);

  const [stats, setStats] = useState({
    totalItems: 0,
    activeListings: 0,
    soldItems: 0,
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    ratingAvg: 0,
    ratingCount: 0,
  });

  const bookingEligibility = useMemo(() => {
    return getBookingLinkEligibility(sellerUserData);
  }, [sellerUserData]);

  useEffect(() => {
    if (!uid) return;
    loadSellerItems();
    loadBookingLinks();
  }, [uid]);

  const getSellerItemsTotal = (orderData: any) => {
    return (
      orderData.items
        ?.filter((item: any) => item.sellerId === uid)
        .reduce((itemSum: number, item: any) => itemSum + item.price * item.quantity, 0) || 0
    );
  };

  const loadBookingLinks = async () => {
    if (!uid) return;

    setRefreshingLinks(true);
    try {
      const linksQuery = query(
        collection(db, "sellerBookingLinks"),
        where("sellerId", "==", uid),
      );
      const linksSnap = await getDocs(linksQuery);
      const links = linksSnap.docs
        .map((linkDoc) => {
          const data = linkDoc.data() as any;
          return {
            id: linkDoc.id,
            itemId: data.itemId,
            itemTitle: data.itemTitle || "Item",
            url: data.url,
            isActive: data.isActive !== false,
            openCount: Number(data.openCount || 0),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          } as SellerBookingLink;
        })
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
          return bTime - aTime;
        });

      setBookingLinks(links);
    } catch (error) {
      console.error("Failed to load booking links:", error);
    } finally {
      setRefreshingLinks(false);
    }
  };

  const loadSellerItems = async () => {
    try {
      const itemsQuery = query(
        collection(db, "marketplaceItems"),
        where("sellerId", "==", uid),
      );
      const snapshot = await getDocs(itemsQuery);
      const itemsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Item[];

      setItems(itemsList);

      if (!selectedItemId && itemsList.length > 0) {
        setSelectedItemId(itemsList[0].id);
      }

      const activeListings = itemsList.filter((item) => item.status === "active").length;
      const soldItems = itemsList.filter((item) => item.status === "sold").length;
      const lowStock = itemsList.filter(
        (item) => item.status === "active" && item.stock <= 5,
      );
      setLowStockItems(lowStock);

      const ordersQuery = query(collection(db, "orders"), where("sellerId", "==", uid));
      const ordersSnapshot = await getDocs(ordersQuery);
      const sellerOrders = ordersSnapshot.docs;

      let ratingAvg = 0;
      let ratingCount = 0;
      try {
        const sellerDoc = await getDoc(doc(db, "users", uid));
        if (sellerDoc.exists()) {
          const sellerData = sellerDoc.data() as Record<string, any>;
          setSellerUserData(sellerData);

          const sellerProfile = sellerData?.sellerProfile || {};
          if (typeof sellerProfile.ratingAvg === "number") {
            ratingAvg = sellerProfile.ratingAvg;
          }
          if (typeof sellerProfile.ratingCount === "number") {
            ratingCount = sellerProfile.ratingCount;
          }
        }
      } catch (error) {
        console.error("Failed to load seller stats:", error);
      }

      const totalRevenue = sellerOrders.reduce((sum, docSnap) => {
        const orderData = docSnap.data();
        return sum + getSellerItemsTotal(orderData);
      }, 0);

      const avgOrderValue = sellerOrders.length > 0 ? totalRevenue / sellerOrders.length : 0;

      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date;
      });

      const salesByDay = last7Days.map((date) => {
        const dateStr = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        const dayOrders = sellerOrders.filter((docSnap) => {
          const orderData = docSnap.data();
          const orderDate = orderData.createdAt?.toDate?.();
          return orderDate && orderDate.toDateString() === date.toDateString();
        });
        const dayRevenue = dayOrders.reduce((sum, docSnap) => {
          const orderData = docSnap.data();
          return sum + getSellerItemsTotal(orderData);
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
        totalOrders: sellerOrders.length,
        avgOrderValue,
        ratingAvg,
        ratingCount,
      });
    } catch (error) {
      console.error("Failed to load seller items:", error);
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

  const handleCreateBookingLink = async () => {
    if (!uid || !selectedItemId) return;

    const selectedItem = items.find((item) => item.id === selectedItemId);
    if (!selectedItem) {
      alert("Select an item first.");
      return;
    }

    if (!bookingEligibility.allowed) {
      alert(bookingEligibility.reason || "Complete onboarding first.");
      await trackSellerOnboardingEvent(uid, "booking_link_blocked", {
        reason: bookingEligibility.reason,
      });
      return;
    }

    setCreatingBookingLink(true);
    try {
      const bookingLinkId = createBookingLinkId();
      const linkUrl = buildSellerBookingLink(window.location.origin, selectedItem.id, bookingLinkId);

      await setDoc(doc(db, "sellerBookingLinks", bookingLinkId), {
        sellerId: uid,
        itemId: selectedItem.id,
        itemTitle: selectedItem.title,
        url: linkUrl,
        isActive: true,
        openCount: 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await trackSellerOnboardingEvent(uid, "booking_link_created", {
        itemId: selectedItem.id,
        itemTitle: selectedItem.title,
      });

      await loadBookingLinks();

      try {
        await navigator.clipboard.writeText(linkUrl);
        alert("Booking link created and copied.");
      } catch (_err) {
        alert(`Booking link created:\n${linkUrl}`);
      }
    } catch (error) {
      console.error("Failed to create booking link:", error);
      alert("Failed to create booking link.");
    } finally {
      setCreatingBookingLink(false);
    }
  };

  const handleToggleBookingLink = async (link: SellerBookingLink) => {
    try {
      await updateDoc(doc(db, "sellerBookingLinks", link.id), {
        isActive: !link.isActive,
        updatedAt: serverTimestamp(),
      });
      setBookingLinks((prev) =>
        prev.map((entry) =>
          entry.id === link.id ? { ...entry, isActive: !entry.isActive } : entry,
        ),
      );
    } catch (error) {
      console.error("Failed to update booking link:", error);
      alert("Failed to update booking link.");
    }
  };

  const handleCopyBookingLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      alert("Copied booking link.");
    } catch (_err) {
      alert(`Copy failed. Link:\n${url}`);
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
              <h1 className="text-3xl font-bold mb-2">Seller Dashboard</h1>
              <p className="text-blue-100">Manage your marketplace listings</p>
            </div>
            <div className="flex space-x-3">
              <Link
                to="/seller/orders"
                className="px-6 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-all"
              >
                View Orders
              </Link>
              <Link
                to="/seller/reviews"
                className="px-6 py-3 bg-white/20 text-white rounded-xl font-semibold hover:bg-white/30 transition-all"
              >
                Reviews
              </Link>
              <Link
                to="/seller/items/new"
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
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold">
                {stats.ratingCount > 0 ? stats.ratingAvg.toFixed(1) : "—"}
              </div>
              <div className="text-blue-100 text-sm">Seller Rating</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-2xl font-bold">{stats.ratingCount}</div>
              <div className="text-blue-100 text-sm">Rating Count</div>
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
                        <Link to={`/seller/items/${item.id}/edit`} className="ml-2 underline">
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

        {/* Booking Link Manager */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Customer Booking Links</h2>
              <p className="text-sm text-gray-600">
                Create shareable links so customers can request courier delivery for your item.
              </p>
            </div>
            <Link
              to="/seller/apply"
              className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
            >
              Manage onboarding
            </Link>
          </div>

          {!bookingEligibility.allowed ? (
            <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
              {bookingEligibility.reason}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="md:col-span-3 px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select listing for booking link</option>
              {items
                .filter((item) => item.status === "active")
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
            </select>

            <button
              onClick={handleCreateBookingLink}
              disabled={
                creatingBookingLink ||
                !selectedItemId ||
                !bookingEligibility.allowed ||
                items.length === 0
              }
              className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold disabled:opacity-50"
            >
              {creatingBookingLink ? "Creating..." : "Create Link"}
            </button>
          </div>

          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Generated Links</h3>
            <button
              onClick={loadBookingLinks}
              disabled={refreshingLinks}
              className="text-xs text-gray-600 hover:text-gray-900"
            >
              {refreshingLinks ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {bookingLinks.length === 0 ? (
            <p className="text-sm text-gray-500">No booking links yet.</p>
          ) : (
            <div className="space-y-3">
              {bookingLinks.map((link) => (
                <div
                  key={link.id}
                  className="border border-gray-200 rounded-lg p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{link.itemTitle}</span>
                      <Badge variant={link.isActive ? "success" : "default"}>
                        {link.isActive ? "active" : "inactive"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{link.url}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Opens: {link.openCount} • Created: {formatTimestamp(link.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyBookingLink(link.url)}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Copy
                    </button>
                    <button
                      onClick={() => handleToggleBookingLink(link)}
                      className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      {link.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sales Analytics Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Sales Overview (Last 7 Days)
          </h2>
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
                to="/seller/items/new"
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
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-bold text-purple-600">${item.price}</span>
                    <div className="flex gap-2">
                      <Link
                        to={`/seller/items/${item.id}/edit`}
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

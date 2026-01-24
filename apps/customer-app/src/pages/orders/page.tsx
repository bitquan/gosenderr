
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";

interface MarketplaceOrder {
  id: string;
  itemId: string;
  itemTitle: string;
  sellerId: string;
  buyerId: string;
  dropoffAddress: any;
  deliveryFee: number;
  platformFee: number;
  itemPrice: number;
  total: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  createdAt: any;
  updatedAt: any;
  checkoutSessionId?: string;
}

interface ItemData {
  title?: string;
  photos?: string[];
  price?: number;
}

export default function CustomerOrdersPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuthUser();
  const [orders, setOrders] = useState<MarketplaceOrder[]>([]);
  const [itemsData, setItemsData] = useState<Record<string, ItemData>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/login");
      return;
    }

    const ordersQuery = query(
      collection(db, "marketplaceOrders"),
      where("buyerId", "==", user.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      async (snapshot) => {
        const ordersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MarketplaceOrder[];

        setOrders(ordersData);

        // Load item data for each order
        const items: Record<string, ItemData> = {};
        for (const order of ordersData) {
          if (order.itemId && !items[order.itemId]) {
            try {
              const itemRef = doc(db, "items", order.itemId);
              const itemSnap = await getDoc(itemRef);
              if (itemSnap.exists()) {
                items[order.itemId] = itemSnap.data() as ItemData;
              }
            } catch (err) {
              console.error(`Failed to load item ${order.itemId}:`, err);
            }
          }
        }
        setItemsData(items);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading orders:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [user, authLoading, navigate]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    try {
      const orderRef = doc(db, "marketplaceOrders", orderId);
      await updateDoc(orderRef, {
        status: "cancelled",
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Failed to cancel order:", err);
      alert("Failed to cancel order. Please try again.");
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    return order.status === filter;
  });

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-4 py-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <Link
            to="/marketplace"
            className="text-sm text-purple-600 font-semibold hover:underline"
          >
            Browse Marketplace
          </Link>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[
            { value: "all", label: "All" },
            { value: "pending", label: "Pending" },
            { value: "confirmed", label: "Confirmed" },
            { value: "shipped", label: "Shipped" },
            { value: "delivered", label: "Delivered" },
            { value: "cancelled", label: "Cancelled" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${
                filter === f.value
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-5xl mb-4">🛒</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No orders found
                </h3>
                <p className="text-gray-600 mb-6">
                  {filter === "all"
                    ? "You haven't placed any orders yet."
                    : `No ${filter} orders found.`}
                </p>
                <Link
                  to="/marketplace"
                  className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                >
                  Browse Marketplace
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const item = itemsData[order.itemId];
              const canCancel =
                order.status === "pending" || order.status === "confirmed";

              return (
                <Card key={order.id} variant="elevated">
                  <CardContent>
                    <div className="flex gap-4">
                      {/* Item Image */}
                      {item?.photos?.[0] ? (
                        <img
                          src={item.photos[0]}
                          alt={order.itemTitle}
                          className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-3xl">📦</span>
                        </div>
                      )}

                      {/* Order Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {order.itemTitle}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              order.status === "delivered"
                                ? "bg-green-100 text-green-700"
                                : order.status === "cancelled"
                                  ? "bg-red-100 text-red-700"
                                  : order.status === "shipped"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {order.status.charAt(0).toUpperCase() +
                              order.status.slice(1)}
                          </span>
                        </div>

                        <div className="space-y-1 text-sm text-gray-600 mb-3">
                          <div>
                            <span className="font-medium">Total:</span> $
                            {order.total.toFixed(2)}
                          </div>
                          <div>
                            <span className="font-medium">Delivery to:</span>{" "}
                            {order.dropoffAddress?.address || "N/A"}
                          </div>
                          <div className="text-xs text-gray-500">
                            Ordered{" "}
                            {order.createdAt?.toDate
                              ? order.createdAt.toDate().toLocaleDateString()
                              : "N/A"}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Link
                            to={`/marketplace/${order.itemId}`}
                            className="text-sm text-purple-600 font-semibold hover:underline"
                          >
                            View Item
                          </Link>
                          {canCancel && (
                            <>
                              <span className="text-gray-300">•</span>
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                className="text-sm text-red-600 font-semibold hover:underline"
                              >
                                Cancel Order
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

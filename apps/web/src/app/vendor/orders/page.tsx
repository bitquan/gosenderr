"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";

export default function VendorOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      router.push("/login");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setCurrentUserId(user.uid);
    });

    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (!currentUserId) return;
    const ordersRef = collection(db, "marketplaceOrders");
    const ordersQuery = query(
      ordersRef,
      where("sellerId", "==", currentUserId),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        setOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (error) => {
        console.error("Error loading orders:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUserId]);

  const handleMarkReady = async (orderId: string) => {
    if (!confirm("Mark order as ready for pickup?")) return;
    await updateDoc(doc(db, "marketplaceOrders", orderId), {
      status: "ready_for_pickup",
      updatedAt: serverTimestamp(),
    });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Vendor Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-gray-500">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-5xl mb-3">🧾</div>
                <p>No orders yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl p-4 border border-purple-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {order.itemTitle || "Order"}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.createdAt?.toDate?.().toLocaleString()}
                        </p>
                      </div>
                      <StatusBadge status={order.status || "pending"} />
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>Buyer: {order.buyerEmail || "Customer"}</p>
                      <p>Total: ${Number(order.total || 0).toFixed(2)}</p>
                    </div>
                    {order.status === "pending" && (
                      <button
                        onClick={() => handleMarkReady(order.id)}
                        className="mt-3 inline-flex px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition"
                      >
                        Mark Ready
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

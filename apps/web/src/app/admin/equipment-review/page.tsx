"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/client";
import { getAuthSafe } from "@/lib/firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import { CourierEquipment, EquipmentItem } from "@gosenderr/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { BottomNav, adminNavItems } from "@/components/ui/BottomNav";
import { Avatar } from "@/components/ui/Avatar";

type EquipmentType =
  | "insulated_bag"
  | "cooler"
  | "hot_bag"
  | "drink_carrier"
  | "dolly"
  | "straps"
  | "furniture_blankets";

const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  insulated_bag: "Insulated Bag 🧊",
  cooler: "Cooler ❄️",
  hot_bag: "Hot Bag 🔥",
  drink_carrier: "Drink Carrier 🥤",
  dolly: "Dolly 🛒",
  straps: "Straps 🪢",
  furniture_blankets: "Furniture Blankets 🧺",
};

interface PendingEquipment {
  courierId: string;
  courierName: string;
  equipmentType: EquipmentType;
  photoUrl: string;
  submittedAt: Date;
}

export default function EquipmentReviewPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pendingItems, setPendingItems] = useState<PendingEquipment[]>([]);
  const [selectedItem, setSelectedItem] = useState<PendingEquipment | null>(
    null,
  );
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      router.push("/login");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/login");
        return;
      }

      // Check if user is admin
      const userDoc = await getDocs(
        query(collection(db, "users"), where("__name__", "==", user.uid)),
      );
      if (userDoc.empty || userDoc.docs[0].data().role !== "admin") {
        router.push("/");
        return;
      }

      setCurrentUser(user);
      await loadPendingEquipment();
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  const loadPendingEquipment = async () => {
    try {
      // Get all users with courier profiles
      const usersSnapshot = await getDocs(
        query(collection(db, "users"), where("courierProfile", "!=", null)),
      );

      const pending: PendingEquipment[] = [];

      usersSnapshot.docs.forEach((userDoc) => {
        const data = userDoc.data();
        const equipment = data.courierProfile?.equipment as CourierEquipment;
        const courierName = data.displayName || "Unknown Courier";

        if (equipment) {
          // Check each equipment type for pending approval
          (Object.keys(equipment) as EquipmentType[]).forEach((type) => {
            const item = equipment[type];
            if (
              item.has &&
              !item.approved &&
              item.photoUrl &&
              !item.rejectedReason
            ) {
              pending.push({
                courierId: userDoc.id,
                courierName,
                equipmentType: type,
                photoUrl: item.photoUrl,
                submittedAt: new Date(), // Would ideally track submission time
              });
            }
          });
        }
      });

      setPendingItems(pending);
    } catch (error) {
      console.error("Failed to load pending equipment:", error);
    }
  };

  const handleApprove = async () => {
    if (!selectedItem || !currentUser) return;

    setProcessing(true);

    try {
      const updatedItem: EquipmentItem = {
        has: true,
        photoUrl: selectedItem.photoUrl,
        approved: true,
        approvedAt: Timestamp.now(),
      };

      await updateDoc(doc(db, "users", selectedItem.courierId), {
        [`courierProfile.equipment.${selectedItem.equipmentType}`]: updatedItem,
      });

      // Update local state
      setPendingItems(pendingItems.filter((item) => item !== selectedItem));
      setSelectedItem(null);
      alert("Equipment approved successfully!");
    } catch (error) {
      console.error("Failed to approve equipment:", error);
      alert("Failed to approve equipment. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedItem || !currentUser || !rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    setProcessing(true);

    try {
      const updatedItem: EquipmentItem = {
        has: true,
        photoUrl: selectedItem.photoUrl,
        approved: false,
        rejectedReason: rejectionReason,
      };

      await updateDoc(doc(db, "users", selectedItem.courierId), {
        [`courierProfile.equipment.${selectedItem.equipmentType}`]: updatedItem,
      });

      // Update local state
      setPendingItems(pendingItems.filter((item) => item !== selectedItem));
      setSelectedItem(null);
      setRejectionReason("");
      alert("Equipment rejected. Courier has been notified.");
    } catch (error) {
      console.error("Failed to reject equipment:", error);
      alert("Failed to reject equipment. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-purple-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-purple-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar
                fallback={currentUser?.displayName || "Admin"}
                size="lg"
              />
              <div>
                <h1 className="text-2xl font-bold">Equipment Review</h1>
                <p className="text-purple-100 text-sm">
                  {pendingItems.length} pending submission
                  {pendingItems.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 -mt-8">
        {pendingItems.length === 0 ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">✅</div>
                <p className="text-gray-600 text-lg">
                  No pending equipment reviews at this time.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
            <div className="space-y-3">
              {pendingItems.map((item, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setSelectedItem(item);
                    setRejectionReason("");
                  }}
                  className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
                    selectedItem === item
                      ? "border-purple-400 bg-purple-50"
                      : "border-gray-200 bg-white hover:border-purple-200"
                  }`}
                >
                  <div className="text-sm font-bold text-gray-900">
                    {item.courierName}
                  </div>
                  <div className="text-xs text-gray-600">
                    {EQUIPMENT_LABELS[item.equipmentType]}
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    Submitted: {item.submittedAt.toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>

            <div>
              {selectedItem ? (
                <Card variant="elevated" className="animate-fade-in">
                  <CardHeader>
                    <CardTitle>{selectedItem.courierName}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Equipment: {EQUIPMENT_LABELS[selectedItem.equipmentType]}
                    </p>

                    <div className="mb-6">
                      <img
                        src={selectedItem.photoUrl}
                        alt={selectedItem.equipmentType}
                        className="w-full max-h-[520px] object-contain rounded-2xl border border-gray-200"
                      />
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Rejection Reason (if rejecting)
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Explain why the equipment photo is being rejected..."
                        className="w-full min-h-[120px] p-3 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-300"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleApprove}
                        disabled={processing}
                        className={`flex-1 py-3 rounded-2xl font-semibold text-white transition ${
                          processing
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-green-500 hover:bg-green-600"
                        }`}
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={processing || !rejectionReason.trim()}
                        className={`flex-1 py-3 rounded-2xl font-semibold text-white transition ${
                          processing || !rejectionReason.trim()
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-red-500 hover:bg-red-600"
                        }`}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card variant="elevated">
                  <CardContent>
                    <div className="text-center py-12 text-gray-600">
                      Select an item from the list to review
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNav items={adminNavItems} />
    </div>
  );
}


import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthSafe } from "@/lib/firebase/auth";
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
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { SwipeableCard } from "@/components/ui/SwipeableCard";

export default function CustomerPackagesNew() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "7d" | "30d">("all");

  const formatDate = (value?: any) => {
    if (!value) return "N/A";
    if (value?.toDate) return value.toDate().toLocaleDateString();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? "N/A"
      : parsed.toLocaleDateString();
  };

  const getDimensionLabel = (pkg: any) => {
    const length = pkg?.dimensions?.length ?? pkg?.length;
    const width = pkg?.dimensions?.width ?? pkg?.width;
    const height = pkg?.dimensions?.height ?? pkg?.height;
    if (length && width && height) {
      return `${length}×${width}×${height}`;
    }
    return "N/A";
  };

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      navigate("/login");
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login");
        return;
      }
      setCurrentUser(user);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!currentUser) return;

    const packagesQuery = query(
      collection(db, "packages"),
      where("senderId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      packagesQuery,
      (snapshot) => {
        const packagesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPackages(packagesData);
        setLoading(false);
      },
      (error) => {
        console.error("Error loading packages:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  const filteredPackages = packages.filter((pkg) => {
    if (filter !== "all" && pkg.currentStatus !== filter) return false;
    if (dateFilter === "all") return true;
    const createdAt = pkg.createdAt?.toDate?.();
    if (!createdAt) return true;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (dateFilter === "7d" ? 7 : 30));
    return createdAt >= cutoff;
  });

  const handleCancelPackage = async (packageId: string) => {
    if (!confirm("Cancel this package before pickup?")) return;
    await updateDoc(doc(db, "packages", packageId), {
      currentStatus: "cancelled",
      updatedAt: serverTimestamp(),
    });
  };

  const handleRequestRefund = async (packageId: string) => {
    if (!confirm("Request a refund for this package?")) return;
    await updateDoc(doc(db, "packages", packageId), {
      refundRequested: true,
      updatedAt: serverTimestamp(),
    });
  };

  const handleRatePackage = async (packageId: string) => {
    const rating = prompt("Rate your delivery (1-5)");
    if (!rating) return;
    const numeric = Number(rating);
    if (!Number.isFinite(numeric) || numeric < 1 || numeric > 5) {
      alert("Please enter a number from 1 to 5.");
      return;
    }
    await updateDoc(doc(db, "packages", packageId), {
      rating: numeric,
      updatedAt: serverTimestamp(),
    });
  };

  const handleEditInstructions = async (
    packageId: string,
    current?: string,
  ) => {
    const instructions = prompt("Delivery instructions", current || "");
    if (instructions === null) return;
    await updateDoc(doc(db, "packages", packageId), {
      deliveryInstructions: instructions,
      updatedAt: serverTimestamp(),
    });
  };

  const handleShareTracking = async (trackingNumber: string) => {
    const link = `${window.location.origin}/track/package/${trackingNumber}`;
    await navigator.clipboard.writeText(link);
    alert("Tracking link copied to clipboard");
  };

  const handleExportCsv = () => {
    const headers = [
      "Package ID",
      "Recipient",
      "Status",
      "Created",
      "Tracking",
    ];
    const rows = filteredPackages.map((pkg) => [
      pkg.id,
      pkg.recipientName || "",
      pkg.currentStatus || "",
      pkg.createdAt?.toDate?.().toLocaleDateString() || "",
      pkg.trackingNumber || "",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "package-history.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { badge: any; color: string }> = {
      payment_pending: { badge: "pending", color: "bg-yellow-50" },
      pickup_pending: { badge: "pending", color: "bg-blue-50" },
      in_transit: { badge: "in_progress", color: "bg-purple-50" },
      delivered: { badge: "completed", color: "bg-green-50" },
    };
    return statusMap[status] || { badge: "pending", color: "bg-gray-50" };
  };

  if (authLoading || loading) {
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
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all"
            >
              ←
            </button>
            <div>
              <h1 className="text-2xl font-bold">My Packages</h1>
              <p className="text-purple-100 text-sm">
                {packages.length} total shipments
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-4xl mx-auto px-6 -mt-4 mb-6 space-y-3">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 overflow-x-auto">
          {[
            { label: "All", value: "all" },
            { label: "Pending", value: "payment_pending" },
            { label: "Pickup", value: "pickup_pending" },
            { label: "In Transit", value: "in_transit" },
            { label: "Delivered", value: "delivered" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all ${
                filter === tab.value
                  ? "bg-purple-600 text-white"
                  : "text-gray-600 hover:bg-purple-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            {[
              { label: "All Time", value: "all" },
              { label: "7 Days", value: "7d" },
              { label: "30 Days", value: "30d" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setDateFilter(tab.value as any)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                  dateFilter === tab.value
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Packages List */}
      <div className="max-w-4xl mx-auto px-6 space-y-4">
        {filteredPackages.length === 0 ? (
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📦</div>
                <p className="text-gray-600 text-lg mb-4">
                  {filter === "all"
                    ? "No packages yet"
                    : `No ${filter.replace("_", " ")} packages`}
                </p>
                <Link
                  to="/request-delivery"
                  className="inline-block bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors"
                >
                  Ship Your First Package
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredPackages.map((pkg: any) => {
            const statusInfo = getStatusInfo(pkg.currentStatus);
            return (
              <SwipeableCard key={pkg.id} className="animate-fade-in">
                <Link to={`/packages/${pkg.id}`} className="block">
                  <Card
                    variant="elevated"
                    hover
                    className={`${statusInfo.color}`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl shadow-sm">
                              📦
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">
                                {pkg.recipientName}
                              </p>
                              <p className="text-sm text-gray-500">
                                {pkg.recipientAddress?.city},{" "}
                                {pkg.recipientAddress?.state}
                              </p>
                            </div>
                          </div>
                        </div>
                        <StatusBadge status={statusInfo.badge} />
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-3 p-3 bg-white/50 rounded-xl">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">
                            Package ID
                          </p>
                          <p className="font-mono text-sm font-medium">
                            {pkg.id.slice(0, 8)}...
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Created</p>
                          <p className="text-sm font-medium">
                            {pkg.createdAt?.toDate?.().toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {pkg.weight || "N/A"} lbs • {getDimensionLabel(pkg)} in
                        </span>
                        <span className="text-purple-600 font-medium">
                          View Details →
                        </span>
                      </div>

                      {(pkg.estimatedDelivery ||
                        pkg.estimatedDeliveryDate ||
                        pkg.eta) && (
                        <div className="mt-2 text-xs text-gray-500">
                          ETA: {formatDate(
                            pkg.estimatedDelivery ||
                              pkg.estimatedDeliveryDate ||
                              pkg.eta,
                          )}
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {pkg.trackingNumber && (
                          <button
                            onClick={(event) => {
                              event.preventDefault();
                              handleShareTracking(pkg.trackingNumber);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-100 text-purple-700 hover:bg-purple-200 transition"
                          >
                            Share Tracking
                          </button>
                        )}
                        <button
                          onClick={(event) => {
                            event.preventDefault();
                            handleEditInstructions(
                              pkg.id,
                              pkg.deliveryInstructions,
                            );
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 transition"
                        >
                          Edit Instructions
                        </button>
                        {["payment_pending", "pickup_pending"].includes(
                          pkg.currentStatus,
                        ) && (
                          <button
                            onClick={(event) => {
                              event.preventDefault();
                              handleCancelPackage(pkg.id);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition"
                          >
                            Cancel
                          </button>
                        )}
                        {pkg.currentStatus === "delivered" && (
                          <>
                            <button
                              onClick={(event) => {
                                event.preventDefault();
                                handleRequestRefund(pkg.id);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-100 text-yellow-700 hover:bg-yellow-200 transition"
                            >
                              Request Refund
                            </button>
                            <button
                              onClick={(event) => {
                                event.preventDefault();
                                handleRatePackage(pkg.id);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-100 text-green-700 hover:bg-green-200 transition"
                            >
                              Rate Delivery
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              </SwipeableCard>
            );
          })
        )}
      </div>
    </div>
  );
}

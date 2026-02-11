
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuthSafe } from "@/lib/firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  onSnapshot,
  doc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { DonutChart } from "@/components/charts/DonutChart";
import { Skeleton } from "@/components/ui/Skeleton";
import type { User } from "firebase/auth";
import type { QuerySnapshot, DocumentData } from "firebase/firestore";
import { parseUsAddressComponents } from "@/lib/pickupPrivacy";

export default function CustomerDashboardNew() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [packages, setPackages] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<
    Array<{ id: string; label: string; address: string; city: string; state: string; zipCode: string }>
  >([]);

  const parseAddressParts = (address: string) => {
    const parsed = parseUsAddressComponents(address);
    return {
      city: parsed.city,
      state: parsed.state,
      zipCode: parsed.zipCode,
    };
  };

  const spendingData = useMemo(() => {
    const deliverySpend = jobs.reduce(
      (sum, job) => sum + (job.agreedFee || 0),
      0,
    );
    const packageSpend = packages.reduce(
      (sum, pkg) => sum + (pkg.price || 0),
      0,
    );
    const total = deliverySpend + packageSpend;

    if (total <= 0) {
      return [
        { name: "Delivery", value: 120 },
        { name: "Packages", value: 80 },
        { name: "Tips", value: 40 },
      ];
    }

    return [
      { name: "Delivery", value: Number(deliverySpend.toFixed(2)) },
      { name: "Packages", value: Number(packageSpend.toFixed(2)) },
    ];
  }, [jobs, packages]);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      navigate("/login");
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((user: User | null) => {
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
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser]);

  useEffect(() => {
    updateActivities(packages, jobs, orders);
  }, [packages, jobs, orders]);

  const loadDashboardData = async () => {
    try {
      const addressesQuery = query(
        collection(db, "savedAddresses"),
        where("userId", "==", currentUser.uid),
      );
      const addressSnapshot = await getDocs(addressesQuery);
      const addressData = addressSnapshot.docs.map((docSnap) => {
        const data = docSnap.data() as {
          label?: string;
          name?: string;
          address?: string;
          city?: string;
          state?: string;
          zipCode?: string;
          postalCode?: string;
        };
        const parsed = parseAddressParts(data.address || "");
        return {
          id: docSnap.id,
          label: data.label || data.name || "",
          address: data.address || "",
          city: data.city || parsed.city,
          state: data.state || parsed.state,
          zipCode: data.zipCode || data.postalCode || parsed.zipCode,
        };
      });
      setSavedAddresses(addressData);

      const packagesQuery = query(
        collection(db, "packages"),
        where("senderId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(5),
      );

      const unsubscribePackages = onSnapshot(
        packagesQuery,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const packagesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setPackages(packagesData);
        },
      );

      const jobsQuery = query(
        collection(db, "jobs"),
        where("createdByUid", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(5),
      );

      const unsubscribeJobs = onSnapshot(
        jobsQuery,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const jobsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setJobs(jobsData);
        },
        (error: Error) => {
          console.error("Error loading jobs:", error);
        },
      );

      const ordersQuery = query(
        collection(db, "marketplaceOrders"),
        where("buyerId", "==", currentUser.uid),
        orderBy("createdAt", "desc"),
        limit(5),
      );

      const unsubscribeOrders = onSnapshot(
        ordersQuery,
        (snapshot: QuerySnapshot<DocumentData>) => {
          const ordersData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setOrders(ordersData);
        },
        (error: Error) => {
          console.error("Error loading orders:", error);
        },
      );

      setLoading(false);

      return () => {
        unsubscribePackages();
        unsubscribeJobs();
        unsubscribeOrders();
      };
    } catch (error) {
      console.error("Error loading dashboard:", error);
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    const label = prompt("Address label (e.g., Home, Office)");
    if (!label) return;
    const address = prompt("Full address");
    if (!address) return;
    const parsed = parseAddressParts(address);

    const docRef = await addDoc(collection(db, "savedAddresses"), {
      userId: currentUser.uid,
      label,
      name: label,
      address,
      city: parsed.city,
      state: parsed.state,
      zipCode: parsed.zipCode,
      postalCode: parsed.zipCode,
      createdAt: serverTimestamp(),
    });
    setSavedAddresses((prev) => [
      ...prev,
      {
        id: docRef.id,
        label,
        address,
        city: parsed.city,
        state: parsed.state,
        zipCode: parsed.zipCode,
      },
    ]);
  };

  const handleRemoveAddress = async (addressId: string) => {
    await deleteDoc(doc(db, "savedAddresses", addressId));
    setSavedAddresses((prev) => prev.filter((addr) => addr.id !== addressId));
  };

  const updateActivities = (pkgs: any[], jbs: any[], ords: any[]) => {
    const allActivities: any[] = [];

    pkgs.forEach((pkg) => {
      allActivities.push({
        id: pkg.id,
        type: "package",
        title: `Package to ${pkg.recipientName}`,
        description: `${pkg.currentStatus || pkg.status || "pending"}`,
        status: pkg.currentStatus || pkg.status,
        timestamp: pkg.updatedAt || pkg.createdAt,
        icon: "📦",
      });
    });

    jbs.forEach((job) => {
      const dropoffLabel =
        job.dropoff?.label ||
        job.dropoff?.address ||
        job.deliveryAddress ||
        "destination";
      allActivities.push({
        id: job.id,
        type: "job",
        title: `Send to ${dropoffLabel}`,
        description: job.status || job.currentStatus || "pending",
        status: job.status || job.currentStatus,
        timestamp: job.updatedAt || job.createdAt,
        icon: "🚚",
      });
    });

    ords.forEach((order) => {
      allActivities.push({
        id: order.id,
        type: "order",
        title: order.itemTitle || "Marketplace Order",
        description: order.status || order.currentStatus || "pending",
        status: order.status || order.currentStatus,
        timestamp: order.updatedAt || order.createdAt,
        icon: "🛒",
      });
    });

    allActivities.sort((a, b) => {
      const aTime = a.timestamp?.toMillis?.() || 0;
      const bTime = b.timestamp?.toMillis?.() || 0;
      return bTime - aTime;
    });

    setActivities(allActivities.slice(0, 10));
  };

  const getStats = () => {
    const totalPackages = packages.length;
    const activePackages = packages.filter(
      (p) => p.status === "in_transit" || p.status === "pickup_pending",
    ).length;
    const deliveredPackages = packages.filter(
      (p) => p.status === "delivered",
    ).length;
    const totalJobs = jobs.length;
    const cancelledJobs = jobs.filter((j) => j.status === "cancelled").length;
    const totalOrders = orders.length;
    const pendingOrders = orders.filter((o) => o.status === "pending").length;

    return {
      totalPackages,
      activePackages,
      deliveredPackages,
      totalJobs,
      cancelledJobs,
      totalOrders,
      pendingOrders,
    };
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
        <div className="max-w-6xl mx-auto space-y-6">
          <Skeleton className="h-24 w-full" variant="purple" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar
                fallback={currentUser?.displayName || currentUser?.email}
                size="lg"
              />
              <div>
                <h1 className="text-2xl font-bold">
                  {currentUser?.displayName || "Welcome"}
                </h1>
                <p className="text-purple-100 text-sm">{currentUser?.email}</p>
              </div>
            </div>
            <Link to="/profile">
              <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-all">
                ⚙️
              </button>
            </Link>
          </div>

          {/* Quick Stats in Header */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-3xl font-bold">{stats.totalPackages}</p>
              <p className="text-sm text-purple-100">Total Packages</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-3xl font-bold">{stats.activePackages}</p>
              <p className="text-sm text-purple-100">In Transit</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <p className="text-3xl font-bold">{stats.totalOrders}</p>
              <p className="text-sm text-purple-100">Marketplace Orders</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 -mt-8 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            title="Delivered"
            value={stats.deliveredPackages}
            icon="✅"
            variant="success"
          />
          <StatCard
            title="Sends"
            value={stats.totalJobs}
            icon="🚚"
            variant="purple"
          />
          <StatCard
            title="Cancelled Sends"
            value={stats.cancelledJobs}
            icon="🚫"
            variant="warning"
          />
          <StatCard
            title="Marketplace Orders"
            value={stats.totalOrders}
            icon="🛒"
            variant="purple"
          />
        </div>

        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle>Spending Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={spendingData} />
          </CardContent>
        </Card>

        <Card variant="elevated" className="animate-fade-in">
          <CardHeader
            action={
              <button
                onClick={handleAddAddress}
                className="text-sm font-semibold text-purple-600"
              >
                + Add
              </button>
            }
          >
            <CardTitle>Saved Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            {savedAddresses.length === 0 ? (
              <p className="text-sm text-gray-500">No saved addresses yet.</p>
            ) : (
              <div className="space-y-3">
                {savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{addr.label}</p>
                      <p className="text-sm text-gray-500">{addr.address}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {addr.city}
                        {addr.state ? `, ${addr.state}` : ""}
                        {addr.zipCode ? ` ${addr.zipCode}` : ""}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveAddress(addr.id)}
                      className="text-xs text-red-600 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Packages */}
        <Card variant="elevated" className="animate-slide-up">
          <CardHeader
            action={
              <Link
                to="/packages"
                className="text-purple-600 text-sm font-medium"
              >
                View All →
              </Link>
            }
          >
            <CardTitle>Recent Packages</CardTitle>
          </CardHeader>
          <CardContent>
            {packages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-5xl mb-3">📦</div>
                <p className="mb-2">No packages yet</p>
                <Link
                  to="/ship"
                  className="text-purple-600 text-sm font-medium"
                >
                  Ship your first package →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {packages.slice(0, 3).map((pkg: any) => (
                  <Link
                    key={pkg.id}
                    to={`/packages/${pkg.id}`}
                    className="block"
                  >
                    <div className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">
                            To: {pkg.recipientName}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">
                            {pkg.recipientAddress?.street}
                          </p>
                        </div>
                        <StatusBadge
                          status={
                            pkg.status === "delivered"
                              ? "completed"
                              : pkg.status === "in_transit"
                                ? "in_progress"
                                : "pending"
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {pkg.createdAt?.toDate?.().toLocaleDateString()}
                        </span>
                        <span className="text-gray-400">
                          ID: {pkg.id.slice(0, 8)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Timeline */}
        <Card variant="elevated" className="animate-slide-up">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-xl">
                      {activity.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        <StatusBadge
                          status={
                            activity.status === "delivered" ||
                            activity.status === "completed"
                              ? "completed"
                              : activity.status === "in_transit" ||
                                  activity.status === "in_progress"
                                ? "in_progress"
                                : activity.status === "cancelled"
                                  ? "cancelled"
                                  : "pending"
                          }
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.timestamp
                          ?.toDate?.()
                          .toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </p>
                    </div>
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

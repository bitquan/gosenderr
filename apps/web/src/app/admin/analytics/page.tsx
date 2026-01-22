"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthSafe } from "@/lib/firebase/auth";
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";

export default function AdminAnalyticsPage() {
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    users: 0,
    jobs: 0,
    packages: 0,
    revenue: 0,
  });
  const [jobStatusCounts, setJobStatusCounts] = useState<
    Record<string, number>
  >({});
  const [roleCounts, setRoleCounts] = useState<Record<string, number>>({});
  const [revenueSeries, setRevenueSeries] = useState<
    Array<{ label: string; revenue: number }>
  >([]);

  useEffect(() => {
    const auth = getAuthSafe();
    if (!auth) {
      router.push("/admin-login");
      return;
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push("/admin-login");
        return;
      }

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists() || userDoc.data()?.role !== "admin") {
        alert("Access denied. Admin privileges required.");
        router.push("/");
        return;
      }

      setAuthLoading(false);
      loadMetrics();
    });

    return () => unsubscribe();
  }, [router]);

  const loadMetrics = async () => {
    try {
      const [usersSnap, jobsSnap, packagesSnap] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "jobs")),
        getDocs(collection(db, "packages")),
      ]);

      const users = usersSnap.docs.map((doc) => doc.data());
      const jobs = jobsSnap.docs.map((doc) => doc.data());
      const packages = packagesSnap.docs.map((doc) => doc.data());

      const revenue = jobs.reduce(
        (sum: number, job: any) => sum + (job.agreedFee || 0),
        0,
      );

      const statusCounts: Record<string, number> = {};
      jobs.forEach((job: any) => {
        statusCounts[job.status || "open"] =
          (statusCounts[job.status || "open"] || 0) + 1;
      });

      const roles: Record<string, number> = {};
      users.forEach((user: any) => {
        roles[user.role || "unknown"] =
          (roles[user.role || "unknown"] || 0) + 1;
      });

      const revenueByDate = new Map<string, number>();
      jobs.forEach((job: any) => {
        const date = job.createdAt?.toDate?.();
        if (!date) return;
        const label = date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        revenueByDate.set(
          label,
          (revenueByDate.get(label) || 0) + (job.agreedFee || 0),
        );
      });

      setRevenueSeries(
        Array.from(revenueByDate.entries()).map(([label, value]) => ({
          label,
          revenue: Number(value.toFixed(2)),
        })),
      );

      setMetrics({
        users: usersSnap.size,
        jobs: jobsSnap.size,
        packages: packagesSnap.size,
        revenue,
      });
      setJobStatusCounts(statusCounts);
      setRoleCounts(roles);
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const statusSeries = useMemo(
    () =>
      Object.entries(jobStatusCounts).map(([label, count]) => ({
        label,
        count,
      })),
    [jobStatusCounts],
  );

  const roleSeries = useMemo(
    () =>
      Object.entries(roleCounts).map(([name, value]) => ({
        name,
        value,
      })),
    [roleCounts],
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] px-6 py-10">
      <div className="max-w-6xl mx-auto space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Admin Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Users"
                value={metrics.users}
                icon="👥"
                variant="purple"
              />
              <StatCard
                title="Jobs"
                value={metrics.jobs}
                icon="🧾"
                variant="info"
              />
              <StatCard
                title="Packages"
                value={metrics.packages}
                icon="📦"
                variant="warning"
              />
              <StatCard
                title="Revenue"
                value={`$${metrics.revenue.toFixed(0)}`}
                icon="💰"
                variant="success"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4 md:grid-cols-2">
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <LineChart data={revenueSeries} xKey="label" yKey="revenue" />
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Jobs by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <BarChart data={statusSeries} xKey="label" yKey="count" />
            </CardContent>
          </Card>
        </div>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>User Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart data={roleSeries} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";

interface PayoutRecord {
  id: string;
  amount: number;
  status: string;
  date: any;
  jobId?: string;
  stripePayoutId?: string;
}

export default function EarningsPage() {
  const { uid } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedJobs: 0,
    pendingPayout: 0,
    avgPerJob: 0,
  });

  useEffect(() => {
    if (!uid) return;
    loadEarnings();
  }, [uid]);

  const loadEarnings = async () => {
    if (!uid) return;

    try {
      // Get completed jobs for this courier
      const jobsQuery = query(
        collection(db, "jobs"),
        where("courierUid", "==", uid),
        where("status", "==", "delivered"),
        orderBy("completedAt", "desc")
      );
      const jobsSnap = await getDocs(jobsQuery);
      const jobs = jobsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Calculate stats
      const totalEarnings = jobs.reduce((sum: number, job: any) => {
        return sum + (job.courierFee || 0);
      }, 0);

      const completedCount = jobs.length;
      const avgPerJob = completedCount > 0 ? totalEarnings / completedCount : 0;

      // Get payouts (if implemented)
      const payoutsQuery = query(
        collection(db, "payouts"),
        where("courierUid", "==", uid),
        orderBy("createdAt", "desc")
      );
      const payoutsSnap = await getDocs(payoutsQuery);
      const payoutsData = payoutsSnap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PayoutRecord[];

      const pendingPayout = payoutsData
        .filter((p) => p.status === "pending")
        .reduce((sum, p) => sum + p.amount, 0);

      setStats({
        totalEarnings,
        completedJobs: completedCount,
        pendingPayout,
        avgPerJob,
      });

      setPayouts(payoutsData);
    } catch (error) {
      console.error("Error loading earnings:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Earnings</h1>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-gray-200 rounded-xl"></div>
            <div className="h-24 bg-gray-200 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-y-auto pb-24 safe-top bg-[#F8F9FF]">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">💰 Earnings</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatCard
            icon="💵"
            label="Total Earned"
            value={`$${stats.totalEarnings.toFixed(2)}`}
          />
          <StatCard
            icon="📦"
            label="Completed Jobs"
            value={stats.completedJobs.toString()}
          />
          <StatCard
            icon="⏳"
            label="Pending Payout"
            value={`$${stats.pendingPayout.toFixed(2)}`}
          />
          <StatCard
            icon="📊"
            label="Avg per Job"
            value={`$${stats.avgPerJob.toFixed(2)}`}
          />
        </div>

        {/* Payout History */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-4xl mb-3">💸</p>
                <p>No payouts yet</p>
                <p className="text-sm mt-2">
                  Complete jobs to start earning!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        ${payout.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {payout.date?.toDate?.()?.toLocaleDateString() || "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                          payout.status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : payout.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {payout.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-sm text-emerald-800">
            <strong>💡 Tip:</strong> Payouts are processed weekly via Stripe Connect.
            Make sure your account is set up in Settings.
          </p>
        </div>
      </div>
    </div>
  );
}

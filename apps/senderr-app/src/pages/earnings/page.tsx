import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { useUserDoc } from "@/hooks/v2/useUserDoc";
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

const DEFAULT_FALLBACK_RATE = 0.05;

// Top marginal single-filer rates (as of 2026-01-17; source: Wikipedia).
const DEFAULT_STATE_TAX_RATES: Record<string, number> = {
  AK: 0.0,
  AL: 0.05,
  AR: 0.039,
  AZ: 0.025,
  CA: 0.133,
  CO: 0.044,
  CT: 0.0699,
  DC: 0.1075,
  DE: 0.066,
  FL: 0.0,
  GA: 0.0539,
  HI: 0.11,
  IA: 0.038,
  ID: 0.05695,
  IL: 0.0495,
  IN: 0.03,
  KS: 0.0558,
  KY: 0.04,
  LA: 0.03,
  MA: 0.09,
  MD: 0.0575,
  ME: 0.0715,
  MI: 0.0425,
  MN: 0.0985,
  MO: 0.047,
  MS: 0.044,
  MT: 0.059,
  NC: 0.0425,
  ND: 0.025,
  NE: 0.052,
  NH: 0.0,
  NJ: 0.1075,
  NM: 0.059,
  NV: 0.0,
  NY: 0.109,
  OH: 0.035,
  OK: 0.0475,
  OR: 0.099,
  PA: 0.0307,
  RI: 0.0599,
  SC: 0.062,
  SD: 0.0,
  TN: 0.0,
  TX: 0.0,
  UT: 0.0455,
  VA: 0.0575,
  VT: 0.0875,
  WA: 0.0,
  WI: 0.0765,
  WV: 0.0482,
  WY: 0.0,
};

const STATE_OPTIONS = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
  { code: "DC", name: "District of Columbia" },
];

export default function EarningsPage() {
  const { uid } = useAuthUser();
  const { userDoc } = useUserDoc();
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [completedJobs, setCompletedJobs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalEarnings: 0,
    completedJobs: 0,
    pendingPayout: 0,
    avgPerJob: 0,
  });
  const [taxYear, setTaxYear] = useState(new Date().getFullYear());
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptCategory, setReceiptCategory] = useState("fuel");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [receiptDate, setReceiptDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [selectedState, setSelectedState] = useState<string>("");
  const [stateTaxRates, setStateTaxRates] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!uid) return;
    loadEarnings();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const taxState =
      (userDoc as any)?.courierProfile?.taxState ||
      (userDoc as any)?.taxState ||
      "";
    if (!selectedState && taxState) {
      setSelectedState(taxState);
    }
  }, [uid, userDoc, selectedState]);

  const loadEarnings = () => {
    if (!uid) return;

    setLoading(true);

    const jobsRef = collection(db, "jobs");
    const primaryQuery = query(jobsRef, where("courierUid", "==", uid));
    const legacyQuery = query(jobsRef, where("courierId", "==", uid));

    let primaryJobs: any[] = [];
    let legacyJobs: any[] = [];

    const mergeJobs = (lists: any[][]) => {
      const map = new Map<string, any>();
      lists.flat().forEach((job) => {
        map.set(job.id, job);
      });
      return Array.from(map.values());
    };

    const calcStats = (jobsList: any[]) => {
      const completedStatuses = new Set(["completed", "delivered"]);
      const completed = jobsList.filter((job) =>
        completedStatuses.has(job.status),
      );
      const totalEarnings = completed.reduce((sum: number, job: any) => {
        return (
          sum +
          (job.agreedFee ||
            job.pricing?.courierRate ||
            job.pricing?.totalAmount ||
            job.courierFee ||
            0)
        );
      }, 0);
      const completedCount = completed.length;
      const avgPerJob = completedCount > 0 ? totalEarnings / completedCount : 0;
      return { totalEarnings, completedCount, avgPerJob, completedJobs: completed };
    };

    const updateState = (merged: any[]) => {
      const { totalEarnings, completedCount, avgPerJob, completedJobs } =
        calcStats(merged);
      setStats((prev) => ({
        ...prev,
        totalEarnings,
        completedJobs: completedCount,
        avgPerJob,
      }));
      setCompletedJobs(completedJobs);
      setLoading(false);
    };

    const unsubPrimary = onSnapshot(
      primaryQuery,
      (snapshot) => {
        primaryJobs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        updateState(mergeJobs([primaryJobs, legacyJobs]));
      },
      (error) => {
        console.error("Error loading earnings:", error);
        setLoading(false);
      },
    );

    const unsubLegacy = onSnapshot(
      legacyQuery,
      (snapshot) => {
        legacyJobs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        updateState(mergeJobs([primaryJobs, legacyJobs]));
      },
      (error) => {
        console.error("Error loading legacy earnings:", error);
        setLoading(false);
      },
    );

    // Get payouts (if implemented)
    let unsubPayouts: (() => void) | null = null;
    try {
      const payoutsQuery = query(
        collection(db, "payouts"),
        where("courierUid", "==", uid),
      );
      unsubPayouts = onSnapshot(payoutsQuery, (snapshot) => {
        const payoutsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as PayoutRecord[];
        const pendingPayout = payoutsData
          .filter((p) => p.status === "pending")
          .reduce((sum, p) => sum + p.amount, 0);
        setStats((prev) => ({ ...prev, pendingPayout }));
        setPayouts(payoutsData);
      });
    } catch (e) {
      console.log("Payouts collection not found or accessible, skipping...");
    }

    return () => {
      unsubPrimary();
      unsubLegacy();
      unsubPayouts?.();
    };
  };

  useEffect(() => {
    if (!uid) return;
    const receiptsQuery = query(
      collection(db, "courierExpenseReceipts"),
      where("courierUid", "==", uid),
      where("year", "==", taxYear),
    );
    const unsubscribe = onSnapshot(receiptsQuery, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as any),
      })) as any[];
      items.sort((a, b) => {
        const aDate = a.date?.toDate?.() ?? new Date(0);
        const bDate = b.date?.toDate?.() ?? new Date(0);
        return bDate.getTime() - aDate.getTime();
      });
      setReceipts(items);
    });
    return () => unsubscribe();
  }, [uid, taxYear]);

  useEffect(() => {
    const ratesDoc = doc(db, "platformSettings", "stateTaxRates");
    const unsubscribe = onSnapshot(ratesDoc, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as any;
      const rates = data?.rates || data;
      if (rates && typeof rates === "object") {
        setStateTaxRates(rates);
      }
    });
    return () => unsubscribe();
  }, []);

  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();
    return [current - 1, current, current + 1];
  }, []);

  const taxYearJobs = useMemo(() => {
    return completedJobs.filter((job) => {
      const date =
        job.completedAt?.toDate?.() ||
        job.updatedAt?.toDate?.() ||
        job.createdAt?.toDate?.();
      return date ? date.getFullYear() === taxYear : false;
    });
  }, [completedJobs, taxYear]);

  const taxYearTotal = useMemo(() => {
    return taxYearJobs.reduce((sum: number, job: any) => {
      return (
        sum +
        (job.agreedFee ||
          job.pricing?.courierRate ||
          job.pricing?.totalAmount ||
          job.courierFee ||
          0)
      );
    }, 0);
  }, [taxYearJobs]);

  const receiptsTotal = useMemo(() => {
    return receipts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  }, [receipts]);

  const stateRate = useMemo(() => {
    if (!selectedState) return null;
    if (selectedState in stateTaxRates) return stateTaxRates[selectedState];
    return DEFAULT_STATE_TAX_RATES[selectedState] ?? DEFAULT_FALLBACK_RATE;
  }, [selectedState, stateTaxRates]);

  const estimatedStateTax = useMemo(() => {
    if (stateRate == null) return null;
    const taxable = Math.max(0, taxYearTotal - receiptsTotal);
    return taxable * stateRate;
  }, [stateRate, taxYearTotal, receiptsTotal]);

  const downloadCsv = (filename: string, rows: string[][]) => {
    const csvContent = rows.map((row) => row.map((cell) =>
      `"${String(cell).replace(/"/g, '""')}"`
    ).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadEarningsCsv = () => {
    const rows = [
      ["Job ID", "Date", "Status", "Amount"],
      ...taxYearJobs.map((job) => {
        const date =
          job.completedAt?.toDate?.() ||
          job.updatedAt?.toDate?.() ||
          job.createdAt?.toDate?.();
        const amount =
          job.agreedFee ||
          job.pricing?.courierRate ||
          job.pricing?.totalAmount ||
          job.courierFee ||
          0;
        return [
          job.id,
          date ? date.toLocaleDateString() : "—",
          job.status,
          amount.toFixed(2),
        ];
      }),
    ];
    downloadCsv(`earnings_${taxYear}.csv`, rows);
  };

  const handleDownloadExpensesCsv = () => {
    const rows = [
      ["Date", "Category", "Amount", "Notes", "Receipt URL"],
      ...receipts.map((item) => [
        item.date?.toDate?.()?.toLocaleDateString() || "—",
        item.category || "—",
        Number(item.amount || 0).toFixed(2),
        item.notes || "",
        item.receiptUrl || "",
      ]),
    ];
    downloadCsv(`expenses_${taxYear}.csv`, rows);
  };

  const handleUploadReceipt = async () => {
    if (!uid || !receiptFile || uploadingReceipt) return;
    setUploadingReceipt(true);
    try {
      const parsedAmount = Number(receiptAmount || 0);
      const expenseDate = receiptDate ? new Date(receiptDate) : new Date();
      const year = expenseDate.getFullYear();
      const storagePath = `courier-expenses/${uid}/${year}/${Date.now()}_${receiptFile.name}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, receiptFile);
      const receiptUrl = await getDownloadURL(storageRef);

      await addDoc(collection(db, "courierExpenseReceipts"), {
        courierUid: uid,
        year,
        amount: parsedAmount,
        category: receiptCategory,
        notes: receiptNotes,
        receiptUrl,
        receiptPath: storagePath,
        fileName: receiptFile.name,
        mimeType: receiptFile.type,
        size: receiptFile.size,
        date: Timestamp.fromDate(expenseDate),
        createdAt: serverTimestamp(),
      });

      setReceiptFile(null);
      setReceiptAmount("");
      setReceiptNotes("");
      setReceiptCategory("fuel");
    } catch (error) {
      console.error("Failed to upload receipt:", error);
      alert("Failed to upload receipt. Please try again.");
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleStateChange = async (stateCode: string) => {
    setSelectedState(stateCode);
    if (!uid) return;
    try {
      await updateDoc(doc(db, "users", uid), {
        "courierProfile.taxState": stateCode,
      });
    } catch (error) {
      console.error("Failed to save tax state:", error);
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
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">💰 Earnings</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <StatCard
            icon="💵"
            title="Total Earned"
            value={`$${stats.totalEarnings.toFixed(2)}`}
          />
          <StatCard
            icon="📦"
            title="Completed Jobs"
            value={stats.completedJobs.toString()}
          />
          <StatCard
            icon="⏳"
            title="Pending Payout"
            value={`$${stats.pendingPayout.toFixed(2)}`}
          />
          <StatCard
            icon="📊"
            title="Avg per Job"
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

        {/* Taxes & Receipts */}
        <Card variant="elevated" className="mt-8">
          <CardHeader>
            <CardTitle>🧾 Taxes & Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              <label className="text-sm font-medium text-gray-700">Tax Year</label>
              <select
                value={taxYear}
                onChange={(e) => setTaxYear(Number(e.target.value))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white border border-gray-200 rounded-xl">
                <p className="text-xs text-gray-500">State</p>
                <select
                  value={selectedState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Select state</option>
                  {STATE_OPTIONS.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-400 mt-2">
                  Top marginal rates. Override in Firestore at platformSettings/stateTaxRates.
                </p>
              </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                <p className="text-xs text-gray-500">Estimated State Tax</p>
                <p className="text-2xl font-bold text-amber-600">
                  {estimatedStateTax == null ? "—" : `$${estimatedStateTax.toFixed(2)}`}
                </p>
                <p className="text-[11px] text-gray-400">
                  {stateRate == null
                    ? "Select a state"
                    : `Rate: ${(stateRate * 100).toFixed(2)}% (top marginal)`}
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                <p className="text-xs text-gray-500">Disclaimer</p>
                <p className="text-xs text-gray-500 mt-2">
                  Estimates are not tax advice. Always consult a tax professional.
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <p className="text-xs text-gray-500">Gross Earnings</p>
                <p className="text-2xl font-bold text-emerald-600">
                  ${taxYearTotal.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">{taxYearJobs.length} jobs</p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs text-gray-500">Expenses</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${receiptsTotal.toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">{receipts.length} receipts</p>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-xl">
                <p className="text-xs text-gray-500">Net (est.)</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${(taxYearTotal - receiptsTotal).toFixed(2)}
                </p>
                <p className="text-xs text-gray-400">Before taxes</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleDownloadEarningsCsv}
                className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-semibold"
              >
                Download Earnings CSV
              </button>
              <button
                onClick={handleDownloadExpensesCsv}
                className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-semibold"
              >
                Download Expenses CSV
              </button>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Upload Expense Receipt
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500">Amount</label>
                  <input
                    type="number"
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Category</label>
                  <select
                    value={receiptCategory}
                    onChange={(e) => setReceiptCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  >
                    <option value="fuel">Fuel</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="equipment">Equipment</option>
                    <option value="supplies">Supplies</option>
                    <option value="insurance">Insurance</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500">Date</label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Receipt File</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="w-full text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-gray-500">Notes</label>
                  <input
                    type="text"
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                    placeholder="Oil change, tires, tolls, etc."
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleUploadReceipt}
                  disabled={!receiptFile || uploadingReceipt}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {uploadingReceipt ? "Uploading..." : "Upload Receipt"}
                </button>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Receipts</h3>
              {receipts.length === 0 ? (
                <div className="text-sm text-gray-500">No receipts uploaded yet.</div>
              ) : (
                <div className="space-y-3">
                  {receipts.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {item.category || "Expense"} • ${Number(item.amount || 0).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.date?.toDate?.()?.toLocaleDateString() || "—"}
                          {item.notes ? ` • ${item.notes}` : ""}
                        </p>
                      </div>
                      <a
                        href={item.receiptUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-indigo-600 font-semibold"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

interface PayoutRecord {
  id: string;
  amount: number;
  status: string;
  date: any;
  jobId?: string;
  stripePayoutId?: string;
}

<<<<<<< HEAD
type EarningsTab = "overview" | "payouts" | "taxes";
=======
interface CourierStripeProfile {
  stripeConnectAccountId?: string;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  stripeRequirementsDue?: string[];
  stripeRequirementsPastDue?: string[];
  stripeAccountStatus?: string;
  taxState?: string;
}
>>>>>>> senderr_app

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
  const navigate = useNavigate();
  const { uid } = useAuthUser();
  const { userDoc } = useUserDoc();
  const courierProfile =
    (userDoc?.courierProfile as CourierStripeProfile | undefined) ?? null;
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<EarningsTab>("overview");
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
  const [stateTaxRates, setStateTaxRates] = useState<Record<string, number>>(
    {},
  );
  const [payoutAmount, setPayoutAmount] = useState("");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [requestingRecharge, setRequestingRecharge] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!uid) return;
    loadEarnings();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    const userRoot = userDoc as { taxState?: string } | null;
    const taxState = courierProfile?.taxState || userRoot?.taxState || "";
    if (!selectedState && taxState) {
      setSelectedState(taxState);
    }
  }, [uid, userDoc, selectedState, courierProfile?.taxState]);

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
      return {
        totalEarnings,
        completedCount,
        avgPerJob,
        completedJobs: completed,
      };
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

  const availableBalance = useMemo(() => {
    return Math.max(0, stats.totalEarnings - stats.pendingPayout);
  }, [stats.totalEarnings, stats.pendingPayout]);

  const hasStripeAccount = Boolean(courierProfile?.stripeConnectAccountId);
  const payoutsEnabled = Boolean(courierProfile?.stripePayoutsEnabled);
  const chargesEnabled = Boolean(courierProfile?.stripeChargesEnabled);
  const stripeRequirementsDue = courierProfile?.stripeRequirementsDue || [];
  const stripeRequirementsPastDue =
    courierProfile?.stripeRequirementsPastDue || [];

  const downloadCsv = (filename: string, rows: string[][]) => {
    const csvContent = rows
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");
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
      const storagePath = `courier-expenses/${uid}/${year}/${Date.now()}_${
        receiptFile.name
      }`;
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

  const parseAmount = (value: string) => {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0 ? amount : null;
  };

  const handleConnectStripe = () => {
    navigate("/onboarding/stripe");
  };

  const handleRequestPayout = async () => {
    if (!uid || requestingPayout) return;
    const amount = parseAmount(payoutAmount);
    setRequestError(null);
    setRequestSuccess(null);

    if (!amount) {
      setRequestError("Enter a valid payout amount.");
      return;
    }
    if (amount > availableBalance) {
      setRequestError("Amount exceeds available balance.");
      return;
    }
    if (!hasStripeAccount) {
      setRequestError("Connect Stripe to request payouts.");
      return;
    }
    if (!payoutsEnabled) {
      setRequestError("Stripe payouts are not enabled yet.");
      return;
    }

    setRequestingPayout(true);
    try {
      await addDoc(collection(db, "payoutRequests"), {
        courierUid: uid,
        amount,
        requestType: "payout",
        payoutMethod: "standard",
        status: "pending",
        balanceSnapshot: stats.totalEarnings,
        pendingSnapshot: stats.pendingPayout,
        requestedAt: serverTimestamp(),
      });
      setPayoutAmount("");
      setRequestSuccess("Payout request submitted.");
    } catch (error) {
      console.error("Failed to request payout:", error);
      setRequestError("Failed to submit payout request.");
    } finally {
      setRequestingPayout(false);
    }
  };

  const handleRequestRecharge = async () => {
    if (!uid || requestingRecharge) return;
    const amount = parseAmount(rechargeAmount);
    setRequestError(null);
    setRequestSuccess(null);

    if (!amount) {
      setRequestError("Enter a valid recharge amount.");
      return;
    }
    if (!hasStripeAccount) {
      setRequestError("Connect Stripe to request recharges.");
      return;
    }
    if (!chargesEnabled) {
      setRequestError("Stripe charges are not enabled yet.");
      return;
    }

    setRequestingRecharge(true);
    try {
      await addDoc(collection(db, "payoutRequests"), {
        courierUid: uid,
        amount,
        requestType: "recharge",
        payoutMethod: "instant",
        status: "pending",
        balanceSnapshot: stats.totalEarnings,
        pendingSnapshot: stats.pendingPayout,
        requestedAt: serverTimestamp(),
      });
      setRechargeAmount("");
      setRequestSuccess("Recharge request submitted.");
    } catch (error) {
      console.error("Failed to request recharge:", error);
      setRequestError("Failed to submit recharge request.");
    } finally {
      setRequestingRecharge(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-purple-950/90 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">Earnings</h1>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-white/20 rounded-xl"></div>
            <div className="h-24 bg-white/15 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-purple-950/90 text-white">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl font-bold text-white mb-6">💰 Earnings</h1>

        <div className="bg-slate-950/70 border border-white/15 rounded-2xl shadow-lg p-2 mb-6 grid grid-cols-3 gap-2 backdrop-blur">
          <button
            onClick={() => setActiveTab("overview")}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === "overview"
                ? "bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 text-white"
                : "text-blue-100 hover:bg-white/10"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("payouts")}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === "payouts"
                ? "bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 text-white"
                : "text-blue-100 hover:bg-white/10"
            }`}
          >
            Payouts
          </button>
          <button
            onClick={() => setActiveTab("taxes")}
            className={`rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              activeTab === "taxes"
                ? "bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 text-white"
                : "text-blue-100 hover:bg-white/10"
            }`}
          >
            Taxes
          </button>
        </div>

<<<<<<< HEAD
        {/* Stats Grid */}
        {(activeTab === "overview" || activeTab === "payouts") && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-white/15 bg-white/10 p-4">
            <p className="text-xs text-blue-100">💵 Total Earned</p>
            <p className="text-2xl font-bold text-white mt-1">${stats.totalEarnings.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 p-4">
            <p className="text-xs text-blue-100">📦 Completed Jobs</p>
            <p className="text-2xl font-bold text-white mt-1">{stats.completedJobs}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 p-4">
            <p className="text-xs text-blue-100">⏳ Pending Payout</p>
            <p className="text-2xl font-bold text-white mt-1">${stats.pendingPayout.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 p-4">
            <p className="text-xs text-blue-100">📊 Avg per Job</p>
            <p className="text-2xl font-bold text-white mt-1">${stats.avgPerJob.toFixed(2)}</p>
          </div>
        </div>
        )}
=======
        {/* Payouts & Recharging */}
        <Card variant="elevated" className="mb-8">
          <CardHeader>
            <CardTitle>💳 Payouts & Recharging</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Stripe Connect
                    </p>
                    <p className="text-xs text-gray-500">
                      Required for payouts and instant recharges.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleConnectStripe}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    {hasStripeAccount ? "Manage Stripe" : "Connect Stripe"}
                  </button>
                </div>
                <div className="mt-3 text-xs text-gray-600">
                  <span className="mr-3">
                    Charges: {chargesEnabled ? "Enabled" : "Pending"}
                  </span>
                  <span className="mr-3">
                    Payouts: {payoutsEnabled ? "Enabled" : "Pending"}
                  </span>
                  <span>
                    Requirements due: {stripeRequirementsDue.length} • Past due: {stripeRequirementsPastDue.length}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Standard Payout
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Transfer your available balance to Stripe payouts.
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    Available: ${availableBalance.toFixed(2)}
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      placeholder="Amount"
                    />
                    <button
                      type="button"
                      onClick={handleRequestPayout}
                      disabled={requestingPayout}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {requestingPayout ? "Submitting..." : "Request"}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    Instant Recharge
                  </p>
                  <p className="text-xs text-gray-500 mb-3">
                    Request an instant payout advance (fees may apply).
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={rechargeAmount}
                      onChange={(e) => setRechargeAmount(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                      placeholder="Amount"
                    />
                    <button
                      type="button"
                      onClick={handleRequestRecharge}
                      disabled={requestingRecharge}
                      className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                    >
                      {requestingRecharge ? "Submitting..." : "Recharge"}
                    </button>
                  </div>
                </div>
              </div>

              {requestError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                  {requestError}
                </div>
              )}
              {requestSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
                  {requestSuccess}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
>>>>>>> senderr_app

        {/* Payout History */}
        {(activeTab === "overview" || activeTab === "payouts") && (
        <Card variant="elevated" className="bg-white/10 border border-white/15 text-white">
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <div className="text-center py-8 text-blue-100">
                <p className="text-4xl mb-3">💸</p>
                <p>No payouts yet</p>
                <p className="text-sm mt-2">Complete jobs to start earning!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payouts.map((payout) => (
                  <div
                    key={payout.id}
                    className="flex justify-between items-center p-4 bg-white/10 border border-white/10 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-white">
                        ${payout.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-blue-100">
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
        )}

        {/* Taxes & Receipts */}
        {(activeTab === "overview" || activeTab === "taxes") && (
        <Card variant="elevated" className="mt-8 bg-white/10 border border-white/15 text-white">
          <CardHeader>
            <CardTitle>🧾 Taxes & Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
<<<<<<< HEAD
              <label className="text-sm font-medium text-blue-100">Tax Year</label>
=======
              <label className="text-sm font-medium text-gray-700">
                Tax Year
              </label>
>>>>>>> senderr_app
              <select
                value={taxYear}
                onChange={(e) => setTaxYear(Number(e.target.value))}
                className="px-3 py-2 border border-white/20 bg-slate-950/40 text-white rounded-lg text-sm"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-white/10 border border-white/15 rounded-xl">
                <p className="text-xs text-blue-100">State</p>
                <select
                  value={selectedState}
                  onChange={(e) => handleStateChange(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-white/20 bg-slate-950/40 text-white rounded-lg text-sm"
                >
                  <option value="">Select state</option>
                  {STATE_OPTIONS.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
<<<<<<< HEAD
                <p className="text-[11px] text-blue-100 mt-2">
                  Top marginal rates. Override in Firestore at platformSettings/stateTaxRates.
=======
                <p className="text-[11px] text-gray-400 mt-2">
                  Top marginal rates. Override in Firestore at
                  platformSettings/stateTaxRates.
>>>>>>> senderr_app
                </p>
              </div>
              <div className="p-4 bg-amber-500/15 border border-amber-300/30 rounded-xl">
                <p className="text-xs text-blue-100">Estimated State Tax</p>
                <p className="text-2xl font-bold text-amber-600">
                  {estimatedStateTax == null
                    ? "—"
                    : `$${estimatedStateTax.toFixed(2)}`}
                </p>
                <p className="text-[11px] text-blue-100">
                  {stateRate == null
                    ? "Select a state"
                    : `Rate: ${(stateRate * 100).toFixed(2)}% (top marginal)`}
                </p>
              </div>
<<<<<<< HEAD
              <div className="p-4 bg-white/10 border border-white/15 rounded-xl">
                <p className="text-xs text-blue-100">Disclaimer</p>
                <p className="text-xs text-blue-100 mt-2">
                  Estimates are not tax advice. Always consult a tax professional.
=======
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl">
                <p className="text-xs text-gray-500">Disclaimer</p>
                <p className="text-xs text-gray-500 mt-2">
                  Estimates are not tax advice. Always consult a tax
                  professional.
>>>>>>> senderr_app
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-emerald-500/15 border border-emerald-300/30 rounded-xl">
                <p className="text-xs text-blue-100">Gross Earnings</p>
                <p className="text-2xl font-bold text-emerald-600">
                  ${taxYearTotal.toFixed(2)}
                </p>
<<<<<<< HEAD
                <p className="text-xs text-blue-100">{taxYearJobs.length} jobs</p>
=======
                <p className="text-xs text-gray-400">
                  {taxYearJobs.length} jobs
                </p>
>>>>>>> senderr_app
              </div>
              <div className="p-4 bg-blue-500/15 border border-blue-300/30 rounded-xl">
                <p className="text-xs text-blue-100">Expenses</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${receiptsTotal.toFixed(2)}
                </p>
<<<<<<< HEAD
                <p className="text-xs text-blue-100">{receipts.length} receipts</p>
=======
                <p className="text-xs text-gray-400">
                  {receipts.length} receipts
                </p>
>>>>>>> senderr_app
              </div>
              <div className="p-4 bg-purple-500/15 border border-purple-300/30 rounded-xl">
                <p className="text-xs text-blue-100">Net (est.)</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${(taxYearTotal - receiptsTotal).toFixed(2)}
                </p>
                <p className="text-xs text-blue-100">Before taxes</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={handleDownloadEarningsCsv}
                className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm font-semibold text-blue-100"
              >
                Download Earnings CSV
              </button>
              <button
                onClick={handleDownloadExpensesCsv}
                className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-sm font-semibold text-blue-100"
              >
                Download Expenses CSV
              </button>
            </div>

            <div className="border-t border-white/15 pt-6">
              <h3 className="text-sm font-semibold text-white mb-3">
                Upload Expense Receipt
              </h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-blue-100">Amount</label>
                  <input
                    type="number"
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-white/20 bg-slate-950/40 text-white rounded-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-xs text-blue-100">Category</label>
                  <select
                    value={receiptCategory}
                    onChange={(e) => setReceiptCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-white/20 bg-slate-950/40 text-white rounded-lg"
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
                  <label className="text-xs text-blue-100">Date</label>
                  <input
                    type="date"
                    value={receiptDate}
                    onChange={(e) => setReceiptDate(e.target.value)}
                    className="w-full px-3 py-2 border border-white/20 bg-slate-950/40 text-white rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-xs text-blue-100">Receipt File</label>
                  <input
                    type="file"
                    accept="image/*,application/pdf"
<<<<<<< HEAD
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-blue-100"
=======
                    onChange={(e) =>
                      setReceiptFile(e.target.files?.[0] || null)
                    }
                    className="w-full text-sm"
>>>>>>> senderr_app
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-blue-100">Notes</label>
                  <input
                    type="text"
                    value={receiptNotes}
                    onChange={(e) => setReceiptNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-white/20 bg-slate-950/40 text-white rounded-lg"
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
<<<<<<< HEAD
              <h3 className="text-sm font-semibold text-white mb-3">Receipts</h3>
              {receipts.length === 0 ? (
                <div className="text-sm text-blue-100">No receipts uploaded yet.</div>
=======
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Receipts
              </h3>
              {receipts.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No receipts uploaded yet.
                </div>
>>>>>>> senderr_app
              ) : (
                <div className="space-y-3">
                  {receipts.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 bg-white/10 border border-white/10 rounded-lg"
                    >
                      <div>
<<<<<<< HEAD
                        <p className="text-sm font-medium text-white">
                          {item.category || "Expense"} • ${Number(item.amount || 0).toFixed(2)}
=======
                        <p className="text-sm font-medium text-gray-900">
                          {item.category || "Expense"} • $
                          {Number(item.amount || 0).toFixed(2)}
>>>>>>> senderr_app
                        </p>
                        <p className="text-xs text-blue-100">
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
        )}

        {/* Info Box */}
<<<<<<< HEAD
        {(activeTab === "overview" || activeTab === "payouts") && (
        <div className="mt-6 p-4 bg-emerald-500/15 border border-emerald-300/30 rounded-xl">
          <p className="text-sm text-emerald-100">
            <strong>💡 Tip:</strong> Payouts are processed weekly via Stripe Connect.
            Make sure your account is set up in Settings.
=======
        <div className="mt-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-sm text-emerald-800">
            <strong>💡 Tip:</strong> Payouts are processed weekly via Stripe
            Connect. Make sure your account is set up in Settings.
>>>>>>> senderr_app
          </p>
        </div>
        )}
      </div>
    </div>
  );
}

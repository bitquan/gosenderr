
import { LoadingState } from "@gosenderr/ui";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Link } from "react-router-dom";
import { getAuthSafe } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  getTokenPolicy,
  getTokenWalletSummary,
  tokenCreateCheckoutSession,
} from "@/lib/v2/jobs";

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

type SettingsTab =
  | "account"
  | "delivery"
  | "payouts"
  | "notifications"
  | "documents"
  | "support";

export default function CourierSettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading } = useAuthUser();
  const [courierData, setCourierData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");
  const [availability, setAvailability] = useState(false);
  const [serviceRadius, setServiceRadius] = useState(10);
  const [taxState, setTaxState] = useState('');
  const [notificationPrefs, setNotificationPrefs] = useState({
    jobOffers: true,
    payoutUpdates: true,
    reminders: true,
  });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [payoutMode, setPayoutMode] = useState<"cash" | "token">("cash");
  const [tokenLoading, setTokenLoading] = useState(false);
  const [tokenTopUpLoading, setTokenTopUpLoading] = useState(false);
  const [tokenPolicy, setTokenPolicy] = useState<{
    enabled: boolean;
    packs: Array<{ id: string; tokens: number; priceUsd: number }>;
  } | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<string>("");
  const [tokenCheckoutMessage, setTokenCheckoutMessage] = useState<string | null>(null);
  const [tokenWallet, setTokenWallet] = useState<{
    available: number;
    reserved: number;
  } | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [documents, setDocuments] = useState<{
    governmentId: File | null;
    vehicleRegistration: File | null;
    insurance: File | null;
  }>({
    governmentId: null,
    vehicleRegistration: null,
    insurance: null,
  });

  useEffect(() => {
    if (user) {
      const loadCourierData = async () => {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setCourierData(userDoc.data());
            const profile = userDoc.data().courierProfile;
            if (profile) {
              setAvailability(Boolean(profile.isOnline));
              setServiceRadius(Number(profile.serviceRadius || 10));
              setTaxState(profile.taxState || userDoc.data().taxState || '');
              setPayoutMode(profile.payoutMode === "token" ? "token" : "cash");
              setNotificationPrefs({
                jobOffers: profile.notificationPrefs?.jobOffers ?? true,
                payoutUpdates: profile.notificationPrefs?.payoutUpdates ?? true,
                reminders: profile.notificationPrefs?.reminders ?? true,
              });
            }
          }

          setTokenLoading(true);
          try {
            const [policy, wallet] = await Promise.all([
              getTokenPolicy(),
              getTokenWalletSummary(),
            ]);
            setTokenPolicy({
              enabled: policy.enabled,
              packs: policy.packs.map((pack) => ({
                id: pack.id,
                tokens: pack.tokens,
                priceUsd: pack.priceUsd,
              })),
            });
            const firstPackId = policy.packs?.[0]?.id || "";
            setSelectedPackId((prev) => prev || firstPackId);
            setTokenWallet({
              available: wallet.available,
              reserved: wallet.reserved,
            });
          } catch (error) {
            console.error("Error loading token policy/wallet:", error);
          } finally {
            setTokenLoading(false);
          }
        } finally {
          setDataLoading(false);
        }
      };

      loadCourierData();
    } else {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    const topupStatus = searchParams.get("tokenTopup");
    if (!topupStatus) return;

    if (topupStatus === "success") {
      setTokenCheckoutMessage("Token top-up completed. Your wallet will refresh shortly.");
      getTokenWalletSummary()
        .then((wallet) => {
          setTokenWallet({
            available: wallet.available,
            reserved: wallet.reserved,
          });
        })
        .catch((error) => {
          console.error("Error refreshing token wallet after top-up:", error);
        });
    } else if (topupStatus === "cancel") {
      setTokenCheckoutMessage("Token top-up was canceled.");
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("tokenTopup");
    nextParams.delete("tokenCheckout");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const checkoutStatus = searchParams.get("tokenCheckout");
    if (!checkoutStatus) return;

    if (checkoutStatus === "emulated") {
      setTokenCheckoutMessage("Emulator checkout fallback was used. No Stripe charge was created.");
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("tokenCheckout");
    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const auth = getAuthSafe();
      if (auth) {
        await auth.signOut();
        navigate("/login");
      }
    } catch (error) {
      console.error("Error signing out:", error);
      setSigningOut(false);
    }
  };

  const handleSavePreferences = async () => {
    if (!user) return;

    const courierStatus = courierData?.courierProfile?.status;
    if (availability && courierStatus !== "approved") {
      alert("Your courier profile must be approved before going online.");
      return;
    }

    setSavingPreferences(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'courierProfile.isOnline': availability,
        'courierProfile.serviceRadius': serviceRadius,
        'courierProfile.taxState': taxState,
        'courierProfile.payoutMode': payoutMode,
        'courierProfile.notificationPrefs': notificationPrefs,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error saving courier preferences:", error);
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleUploadDocuments = async () => {
    if (!user) return;

    const files = [
      { label: "Government ID", file: documents.governmentId },
      { label: "Vehicle Registration", file: documents.vehicleRegistration },
      { label: "Insurance", file: documents.insurance },
    ].filter((item) => Boolean(item.file)) as Array<{ label: string; file: File }>;

    if (files.length === 0) {
      alert("Select at least one document to upload.");
      return;
    }

    setUploadingDocs(true);
    try {
      const uploads: Array<{
        label: string;
        url: string;
        name: string;
        contentType: string;
        uploadedAt: any;
      }> = [];

      for (const item of files) {
        const storageRef = ref(
          storage,
          `courierDocuments/${user.uid}/${Date.now()}_${item.file.name}`
        );
        await uploadBytes(storageRef, item.file);
        const url = await getDownloadURL(storageRef);
        uploads.push({
          label: item.label,
          url,
          name: item.file.name,
          contentType: item.file.type || "application/octet-stream",
          uploadedAt: new Date(),
        });
      }

      const existingDocs = Array.isArray(courierData?.courierProfile?.documents)
        ? courierData.courierProfile.documents
        : [];

      const currentStatus = courierData?.courierProfile?.status;
      const shouldResetStatus = currentStatus === "rejected" || currentStatus === "pending";

      await updateDoc(doc(db, "users", user.uid), {
        "courierProfile.documents": [...existingDocs, ...uploads],
        ...(shouldResetStatus
          ? {
              "courierProfile.status": "pending",
              "courierProfile.rejectionReason": null,
            }
          : {}),
        "courierProfile.updatedAt": serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setCourierData((prev: any) => ({
        ...prev,
        courierProfile: {
          ...prev?.courierProfile,
          documents: [...existingDocs, ...uploads],
          ...(shouldResetStatus
            ? { status: "pending", rejectionReason: null }
            : {}),
        },
      }));

      setDocuments({ governmentId: null, vehicleRegistration: null, insurance: null });
      alert("Documents uploaded successfully.");
    } catch (error) {
      console.error("Error uploading documents:", error);
      alert("Failed to upload documents. Please try again.");
    } finally {
      setUploadingDocs(false);
    }
  };

  const handleTokenTopUp = async () => {
    if (!tokenPolicy?.enabled || !tokenPolicy.packs.length) {
      alert("Token top-up is currently unavailable.");
      return;
    }

    const selectedPack = tokenPolicy.packs.find((pack) => pack.id === selectedPackId) || tokenPolicy.packs[0];
    const randomSuffix =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
        : `${Date.now()}`;
    const idempotencyKey = `topup_${Date.now()}_${randomSuffix}`;

    setTokenTopUpLoading(true);
    try {
      const successUrl = `${window.location.origin}/settings?tokenTopup=success`;
      const cancelUrl = `${window.location.origin}/settings?tokenTopup=cancel`;
      const session = await tokenCreateCheckoutSession(
        selectedPack.id,
        successUrl,
        cancelUrl,
        idempotencyKey,
      );

      if (!session.url) {
        throw new Error("Checkout URL missing");
      }

      window.location.href = session.url;
    } catch (error) {
      console.error("Error creating token checkout session:", error);
      alert("Unable to start token top-up right now. Please try again.");
    } finally {
      setTokenTopUpLoading(false);
    }
  };

  if (loading || dataLoading) {
    return <LoadingState fullPage message="Loading settings..." />;
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-purple-950/90">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Header */}
        <div className="space-y-2 rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 text-white shadow-2xl border border-white/20 px-5 py-5">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              ⚙️ Settings & Preferences
            </h1>
          </div>
          <p className="text-sm text-blue-100">Manage courier profile, payouts, and token mode.</p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-slate-950/70 p-2 backdrop-blur">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: "account", label: "Account" },
              { id: "delivery", label: "Delivery" },
              { id: "payouts", label: "Payouts" },
              { id: "notifications", label: "Notifications" },
              { id: "documents", label: "Documents" },
              { id: "support", label: "Support" },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTab)}
                  className={`rounded-xl px-3 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 text-white"
                      : "bg-white/10 text-blue-100 hover:bg-white/20"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Account Section */}
        {activeTab === "account" && (
        <div className="bg-slate-950/70 rounded-2xl border border-white/15 overflow-hidden text-white backdrop-blur">
          <div className="p-6 sm:p-8 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">
              👤 Account
            </h2>
            <div className="space-y-4">
              <Link
                to="/profile"
                className="flex items-center justify-between rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-sm font-semibold text-blue-100 hover:bg-white/20"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🧾</span>
                  <span>Profile</span>
                </div>
                <span className="text-blue-200">→</span>
              </Link>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white/10 border border-white/15 rounded-xl p-4">
                  <p className="text-xs text-blue-100 font-medium mb-1">Email</p>
                  <p className="text-lg font-semibold text-white break-all">
                    {user.email || 'N/A'}
                  </p>
                </div>
                <div className="bg-white/10 border border-white/15 rounded-xl p-4">
                  <p className="text-xs text-blue-100 font-medium mb-1">Account Type</p>
                  <p className="text-lg font-semibold text-white">
                    {courierData?.role === 'courier' ? '📦 Courier' : '⚙️ Admin'}
                  </p>
                </div>
              </div>
              {courierData?.courierProfile && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-600/20 rounded-xl p-4 border border-blue-300/30">
                    <p className="text-xs text-blue-100 font-medium mb-1">Status</p>
                    <p className="text-lg font-bold text-white">
                      {courierData.courierProfile.isOnline ? '🟢 Online' : '⚪ Offline'}
                    </p>
                  </div>
                  <div className="bg-emerald-600/20 rounded-xl p-4 border border-emerald-300/30">
                    <p className="text-xs text-emerald-100 font-medium mb-1">Completed Deliveries</p>
                    <p className="text-lg font-bold text-white">
                      {courierData.courierProfile.completedJobs || 0}
                    </p>
                  </div>
                  <div className="bg-purple-600/20 rounded-xl p-4 border border-purple-300/30">
                    <p className="text-xs text-purple-100 font-medium mb-1">Today's Deliveries</p>
                    <p className="text-lg font-bold text-white">
                      {courierData.courierProfile.todayJobs || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Delivery Settings Section */}
        {activeTab === "delivery" && (
        <div className="bg-slate-950/70 rounded-2xl border border-white/15 overflow-hidden text-white backdrop-blur">
          <div className="p-6 sm:p-8 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">
              🚚 Delivery Settings
            </h2>
            <div className="space-y-5 mb-6">
              <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Availability</p>
                  <p className="text-xs text-blue-100">
                    Toggle whether you are accepting new deliveries.
                  </p>
                </div>
                <button
                  onClick={() => setAvailability((prev) => !prev)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                    availability ? "bg-emerald-500" : "bg-gray-300"
                  }`}
                  aria-label="Toggle availability"
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                      availability ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Service radius</p>
                    <p className="text-xs text-blue-100">
                      How far you are willing to drive for pickups.
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {serviceRadius} mi
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={50}
                  step={1}
                  value={serviceRadius}
                  onChange={(event) => setServiceRadius(Number(event.target.value))}
                  className="mt-3 w-full"
                />
                <div className="mt-2 flex justify-between text-xs text-blue-100">
                  <span>1 mi</span>
                  <span>50 mi</span>
                </div>
              </div>

              <button
                onClick={handleSavePreferences}
                disabled={savingPreferences}
                className="w-full rounded-xl bg-gradient-to-r from-blue-700 via-blue-600 to-purple-600 px-4 py-3 text-sm font-semibold text-white hover:opacity-95 disabled:opacity-60"
              >
                {savingPreferences ? "Saving..." : "Save Delivery Preferences"}
              </button>
            </div>
            <div className="space-y-3">
              <Link
                to="/rate-cards"
                className="flex items-center justify-between rounded-xl bg-gradient-to-br from-slate-900 via-purple-900 to-purple-950/90 text-white border border-white/10 px-6 py-4 font-semibold transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <div className="text-left">
                    <p className="font-bold">Rate Cards & Pricing</p>
                    <p className="text-xs text-blue-100">Set your delivery rates</p>
                  </div>
                </div>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>

              <Link
                to="/equipment"
                className="flex items-center justify-between rounded-xl bg-gradient-to-br from-slate-900 via-purple-900 to-purple-950/90 text-white border border-white/10 px-6 py-4 font-semibold transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎒</span>
                  <div className="text-left">
                    <p className="font-bold">Equipment & Vehicle</p>
                    <p className="text-xs text-blue-100">Manage your delivery equipment</p>
                  </div>
                </div>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </div>
        )}

        {/* Tax & Payout Settings */}
        {activeTab === "payouts" && (
        <>
        <div className="bg-slate-950/70 rounded-2xl border border-white/15 overflow-hidden text-white backdrop-blur">
          <div className="p-6 sm:p-8 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">
              🧾 Taxes & Payouts
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white/10 border border-white/15 rounded-xl p-4">
                <p className="text-xs text-blue-100 font-medium mb-1">Tax State</p>
                <select
                  value={taxState}
                  onChange={(e) => setTaxState(e.target.value)}
                  className="w-full px-3 py-2 border border-white/20 bg-slate-950/40 text-white rounded-lg text-sm"
                >
                  <option value="">Select state</option>
                  {STATE_OPTIONS.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-blue-100 mt-2">
                  Used for tax estimates in Earnings.
                </p>
              </div>
              <div className="bg-white/10 border border-white/15 rounded-xl p-4">
                <p className="text-xs text-blue-100 font-medium mb-1">Payouts</p>
                <div className="mt-2">
                  <label className="text-xs text-blue-100 font-medium">Payout Mode</label>
                  <select
                    value={payoutMode}
                    onChange={(event) => setPayoutMode(event.target.value as "cash" | "token")}
                    className="mt-1 w-full px-3 py-2 border border-white/20 bg-slate-950/40 text-white rounded-lg text-sm"
                  >
                    <option value="cash">Cash payouts</option>
                    <option value="token">Token wallet mode</option>
                  </select>
                </div>
                <Link
                  to="/earnings"
                  className="inline-flex items-center gap-2 mt-1 text-sm font-semibold text-blue-200"
                >
                  View earnings & payouts →
                </Link>
                <p className="text-xs text-blue-100 mt-2">
                  Update your Stripe Connect details in Earnings.
                </p>

                {payoutMode === "token" && (
                  <div className="mt-3 rounded-lg border border-emerald-300/30 bg-emerald-600/15 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-emerald-100">Token Wallet</p>
                        <p className="text-xs text-emerald-100 mt-1">
                          Token mode requires an unlock cost before claiming jobs.
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-950/40 border border-emerald-300/30 px-2 py-1 text-[11px] font-semibold text-emerald-100">
                        {tokenPolicy?.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </div>
                    {tokenLoading ? (
                      <p className="text-xs text-emerald-100 mt-1">Loading wallet...</p>
                    ) : (
                      <>
                        {tokenCheckoutMessage && (
                          <p className="text-xs text-emerald-100 mt-2 rounded-md bg-slate-950/40 border border-emerald-300/30 px-2 py-1">
                            {tokenCheckoutMessage}
                          </p>
                        )}
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div className="rounded-md border border-emerald-300/30 bg-slate-950/40 px-2 py-2">
                            <p className="text-[11px] text-emerald-100">Available</p>
                            <p className="text-sm font-semibold text-white">
                              {tokenWallet?.available ?? 0} tokens
                            </p>
                          </div>
                          <div className="rounded-md border border-emerald-300/30 bg-slate-950/40 px-2 py-2">
                            <p className="text-[11px] text-emerald-100">Reserved</p>
                            <p className="text-sm font-semibold text-white">
                              {tokenWallet?.reserved ?? 0} tokens
                            </p>
                          </div>
                        </div>
                        <div className="mt-3">
                          <label className="text-xs font-medium text-emerald-100">Token Pack</label>
                          <select
                            value={selectedPackId}
                            onChange={(event) => setSelectedPackId(event.target.value)}
                            className="mt-1 w-full rounded-lg border border-emerald-300/30 bg-slate-950/40 text-white px-3 py-2 text-xs"
                          >
                            {(tokenPolicy?.packs || []).map((pack) => (
                              <option key={pack.id} value={pack.id}>
                                {pack.tokens} tokens — ${pack.priceUsd.toFixed(2)} ({pack.id})
                              </option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={handleTokenTopUp}
                          disabled={tokenTopUpLoading || !tokenPolicy?.enabled || !tokenPolicy.packs.length}
                          className="mt-3 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {tokenTopUpLoading ? "Starting top-up..." : "Start token checkout"}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        

        {/* Payments Section */}
        <div className="bg-slate-950/70 rounded-2xl border border-white/15 overflow-hidden text-white backdrop-blur">
          <div className="p-6 sm:p-8 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">
              💳 Payments
            </h2>
            <div className="space-y-3">
              <Link
                to="/earnings"
                className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-600/20 to-green-600/20 border border-emerald-300/30 px-6 py-4 font-semibold text-white hover:bg-emerald-600/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💵</span>
                  <div className="text-left">
                    <p className="font-bold">Earnings & Payouts</p>
                    <p className="text-xs text-blue-100">View your earnings history</p>
                  </div>
                </div>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>

              <Link
                to="/onboarding/stripe"
                className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-300/30 px-6 py-4 font-semibold text-white hover:bg-blue-600/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏦</span>
                  <div className="text-left">
                    <p className="font-bold">Stripe Connect Setup</p>
                    <p className="text-xs text-blue-100">Connect your bank account</p>
                  </div>
                </div>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </div>
        </>
        )}

        {/* Notification Preferences */}
        {activeTab === "notifications" && (
        <div className="bg-slate-950/70 rounded-2xl border border-white/15 overflow-hidden text-white backdrop-blur">
          <div className="p-6 sm:p-8 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">
              🔔 Notifications
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Job Offers</p>
                  <p className="text-xs text-blue-100">Get notified when new jobs are available.</p>
                </div>
                <button
                  onClick={() =>
                    setNotificationPrefs((prev) => ({
                      ...prev,
                      jobOffers: !prev.jobOffers,
                    }))
                  }
                  className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                    notificationPrefs.jobOffers
                      ? "bg-emerald-600/20 text-emerald-100 border-emerald-300/30"
                      : "bg-slate-950/40 text-blue-100 border-white/20"
                  }`}
                >
                  {notificationPrefs.jobOffers ? "On" : "Off"}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Payout Updates</p>
                  <p className="text-xs text-blue-100">Get notified about payout status.</p>
                </div>
                <button
                  onClick={() =>
                    setNotificationPrefs((prev) => ({
                      ...prev,
                      payoutUpdates: !prev.payoutUpdates,
                    }))
                  }
                  className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                    notificationPrefs.payoutUpdates
                      ? "bg-emerald-600/20 text-emerald-100 border-emerald-300/30"
                      : "bg-slate-950/40 text-blue-100 border-white/20"
                  }`}
                >
                  {notificationPrefs.payoutUpdates ? "On" : "Off"}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/10 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Reminders</p>
                  <p className="text-xs text-blue-100">Get reminders for documents and tasks.</p>
                </div>
                <button
                  onClick={() =>
                    setNotificationPrefs((prev) => ({
                      ...prev,
                      reminders: !prev.reminders,
                    }))
                  }
                  className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                    notificationPrefs.reminders
                      ? "bg-emerald-600/20 text-emerald-100 border-emerald-300/30"
                      : "bg-slate-950/40 text-blue-100 border-white/20"
                  }`}
                >
                  {notificationPrefs.reminders ? "On" : "Off"}
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Verification Documents */}
        {activeTab === "documents" && (
        <div className="bg-slate-950/70 rounded-2xl border border-white/15 overflow-hidden text-white backdrop-blur">
          <div className="p-6 sm:p-8 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">
              🧾 Verification Documents
            </h2>
            <p className="text-sm text-blue-100 mb-6">
              Upload updated documents if your details have changed or if your application was rejected.
            </p>

            {Array.isArray(courierData?.courierProfile?.documents) &&
              courierData.courierProfile.documents.length > 0 && (
                <div className="bg-white/10 border border-white/15 rounded-xl p-4 mb-6">
                  <p className="text-xs text-blue-100 mb-2">Current Documents</p>
                  <div className="space-y-2">
                    {courierData.courierProfile.documents.map((docItem: any) => (
                      <div key={docItem.url} className="flex items-center justify-between text-sm">
                        <span className="text-blue-100">
                          {docItem.label}: {docItem.name}
                        </span>
                        <a
                          href={docItem.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-200 hover:underline"
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-blue-100 mb-2">
                  Government ID
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) =>
                    setDocuments({
                      ...documents,
                      governmentId: e.target.files?.[0] || null,
                    })
                  }
                  className="block w-full text-sm text-blue-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-700 file:text-white hover:file:bg-blue-600"
                />
                {documents.governmentId && (
                  <p className="text-xs text-blue-100 mt-2">
                    Selected: {documents.governmentId.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-blue-100 mb-2">
                  Vehicle Registration
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) =>
                    setDocuments({
                      ...documents,
                      vehicleRegistration: e.target.files?.[0] || null,
                    })
                  }
                  className="block w-full text-sm text-blue-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-700 file:text-white hover:file:bg-blue-600"
                />
                {documents.vehicleRegistration && (
                  <p className="text-xs text-blue-100 mt-2">
                    Selected: {documents.vehicleRegistration.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-blue-100 mb-2">
                  Proof of Insurance
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) =>
                    setDocuments({
                      ...documents,
                      insurance: e.target.files?.[0] || null,
                    })
                  }
                  className="block w-full text-sm text-blue-100 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-700 file:text-white hover:file:bg-blue-600"
                />
                {documents.insurance && (
                  <p className="text-xs text-blue-100 mt-2">
                    Selected: {documents.insurance.name}
                  </p>
                )}
              </div>

              <div className="text-xs text-blue-100">
                Accepted formats: JPG, PNG, WEBP, PDF. Max size 15MB.
              </div>

              <button
                onClick={handleUploadDocuments}
                disabled={uploadingDocs}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {uploadingDocs ? "Uploading..." : "Upload Documents"}
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Support Section */}
        {activeTab === "support" && (
        <>
        <div className="bg-slate-950/70 rounded-2xl border border-white/15 overflow-hidden text-white backdrop-blur">
          <div className="p-6 sm:p-8 border-b border-white/10">
            <h2 className="text-2xl font-bold text-white mb-6">
              ❓ Help & Support
            </h2>
            <Link
              to="/support"
              className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-300/30 px-6 py-4 font-semibold text-white hover:bg-amber-600/30 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <div className="text-left">
                  <p className="font-bold">Contact Support</p>
                  <p className="text-xs text-blue-100">Get help with your account</p>
                </div>
              </div>
              <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/15 rounded-2xl border border-red-300/30 overflow-hidden text-white backdrop-blur">
          <div className="p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-red-100 mb-6">
              🚪 Danger Zone
            </h2>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center justify-center gap-3 rounded-xl bg-red-500 text-white px-6 py-4 font-bold text-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
            >
              <span className="text-2xl">🚪</span>
              <span>{signingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
            <p className="text-xs text-red-100 mt-3 text-center">
              You'll be logged out and returned to the login screen
            </p>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}

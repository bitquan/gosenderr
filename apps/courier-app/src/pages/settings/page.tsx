
import { LoadingState } from "@gosenderr/ui";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import { Link } from "react-router-dom";
import { getAuthSafe } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

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

export default function CourierSettingsPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuthUser();
  const [courierData, setCourierData] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);
  const [availability, setAvailability] = useState(false);
  const [serviceRadius, setServiceRadius] = useState(10);
  const [taxState, setTaxState] = useState('');
  const [notificationPrefs, setNotificationPrefs] = useState({
    jobOffers: true,
    payoutUpdates: true,
    reminders: true,
  });
  const [notificationSettings, setNotificationSettings] = useState({
    deliveryUpdates: true,
    nearbyCourierAlerts: true,
    marketing: false,
  });
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
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
              setNotificationPrefs({
                jobOffers: profile.notificationPrefs?.jobOffers ?? true,
                payoutUpdates: profile.notificationPrefs?.payoutUpdates ?? true,
                reminders: profile.notificationPrefs?.reminders ?? true,
              });
            }

            const prefs = userDoc.data().notificationPreferences || {};
            setNotificationSettings({
              deliveryUpdates: prefs.deliveryUpdates ?? true,
              nearbyCourierAlerts: prefs.nearbyCourierAlerts ?? true,
              marketing: prefs.marketing ?? false,
            });
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

    setSavingPreferences(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'courierProfile.isOnline': availability,
        'courierProfile.serviceRadius': serviceRadius,
        'courierProfile.taxState': taxState,
        'courierProfile.notificationPrefs': notificationPrefs,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error saving courier preferences:", error);
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    if (!user) return;

    setSavingNotifications(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationPreferences: notificationSettings,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error saving notification preferences:", error);
    } finally {
      setSavingNotifications(false);
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

  if (loading || dataLoading) {
    return <LoadingState fullPage message="Loading settings..." />;
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              ⚙️ Settings & Preferences
            </h1>
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              👤 Account
            </h2>
            <div className="space-y-4">
              <Link
                to="/profile"
                className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🧾</span>
                  <span>Profile</span>
                </div>
                <span className="text-gray-400">→</span>
              </Link>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-600 font-medium mb-1">Email</p>
                  <p className="text-lg font-semibold text-gray-900 break-all">
                    {user.email || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-600 font-medium mb-1">Account Type</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {courierData?.role === 'courier' ? '📦 Courier' : '⚙️ Admin'}
                  </p>
                </div>
              </div>
              {courierData?.courierProfile && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <p className="text-xs text-blue-600 font-medium mb-1">Status</p>
                    <p className="text-lg font-bold text-blue-900">
                      {courierData.courierProfile.isOnline ? '🟢 Online' : '⚪ Offline'}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                    <p className="text-xs text-emerald-600 font-medium mb-1">Completed Deliveries</p>
                    <p className="text-lg font-bold text-emerald-900">
                      {courierData.courierProfile.completedJobs || 0}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                    <p className="text-xs text-purple-600 font-medium mb-1">Today's Deliveries</p>
                    <p className="text-lg font-bold text-purple-900">
                      {courierData.courierProfile.todayJobs || 0}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Delivery Settings Section */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🚚 Delivery Settings
            </h2>
            <div className="space-y-5 mb-6">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Availability</p>
                  <p className="text-xs text-gray-500">
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

              <div className="rounded-xl border border-gray-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Service radius</p>
                    <p className="text-xs text-gray-500">
                      How far you are willing to drive for pickups.
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
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
                <div className="mt-2 flex justify-between text-xs text-gray-400">
                  <span>1 mi</span>
                  <span>50 mi</span>
                </div>
              </div>

              <button
                onClick={handleSavePreferences}
                disabled={savingPreferences}
                className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
              >
                {savingPreferences ? "Saving..." : "Save Delivery Preferences"}
              </button>
            </div>
            <div className="space-y-3">
              <Link
                to="/rate-cards"
                className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 px-6 py-4 font-semibold text-gray-900 hover:border-blue-300 hover:from-blue-100 hover:to-indigo-100 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💰</span>
                  <div className="text-left">
                    <p className="font-bold">Rate Cards & Pricing</p>
                    <p className="text-xs text-gray-600">Set your delivery rates</p>
                  </div>
                </div>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>

              <Link
                to="/equipment"
                className="flex items-center justify-between rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 px-6 py-4 font-semibold text-gray-900 hover:border-purple-300 hover:from-purple-100 hover:to-pink-100 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎒</span>
                  <div className="text-left">
                    <p className="font-bold">Equipment & Vehicle</p>
                    <p className="text-xs text-gray-600">Manage your delivery equipment</p>
                  </div>
                </div>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Tax & Payout Settings */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🧾 Taxes & Payouts
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-600 font-medium mb-1">Tax State</p>
                <select
                  value={taxState}
                  onChange={(e) => setTaxState(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Select state</option>
                  {STATE_OPTIONS.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  Used for tax estimates in Earnings.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-600 font-medium mb-1">Payouts</p>
                <Link
                  to="/earnings"
                  className="inline-flex items-center gap-2 mt-1 text-sm font-semibold text-indigo-600"
                >
                  View earnings & payouts →
                </Link>
                <p className="text-xs text-gray-500 mt-2">
                  Update your Stripe Connect details in Earnings.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🔔 Notifications
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Delivery Updates</p>
                  <p className="text-xs text-gray-500">Get notified about job status changes.</p>
                </div>
                <button
                  onClick={() =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      deliveryUpdates: !prev.deliveryUpdates,
                    }))
                  }
                  className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                    notificationSettings.deliveryUpdates
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {notificationSettings.deliveryUpdates ? "On" : "Off"}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Nearby Courier Alerts</p>
                  <p className="text-xs text-gray-500">Get notified about nearby job opportunities.</p>
                </div>
                <button
                  onClick={() =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      nearbyCourierAlerts: !prev.nearbyCourierAlerts,
                    }))
                  }
                  className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                    notificationSettings.nearbyCourierAlerts
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {notificationSettings.nearbyCourierAlerts ? "On" : "Off"}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Marketing</p>
                  <p className="text-xs text-gray-500">Opt in to promos and product updates.</p>
                </div>
                <button
                  onClick={() =>
                    setNotificationSettings((prev) => ({
                      ...prev,
                      marketing: !prev.marketing,
                    }))
                  }
                  className={`px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                    notificationSettings.marketing
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {notificationSettings.marketing ? "On" : "Off"}
                </button>
              </div>

              <button
                onClick={handleSaveNotificationSettings}
                disabled={savingNotifications}
                className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {savingNotifications ? "Saving..." : "Save Notification Preferences"}
              </button>

              <div className="text-xs text-gray-500">
                These settings control push notifications sent to your device.
              </div>

              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Job Offers</p>
                  <p className="text-xs text-gray-500">Get notified when new jobs are available.</p>
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
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {notificationPrefs.jobOffers ? "On" : "Off"}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Payout Updates</p>
                  <p className="text-xs text-gray-500">Get notified about payout status.</p>
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
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {notificationPrefs.payoutUpdates ? "On" : "Off"}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Reminders</p>
                  <p className="text-xs text-gray-500">Get reminders for documents and tasks.</p>
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
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {notificationPrefs.reminders ? "On" : "Off"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Documents */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              🧾 Verification Documents
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Upload updated documents if your details have changed or if your application was rejected.
            </p>

            {Array.isArray(courierData?.courierProfile?.documents) &&
              courierData.courierProfile.documents.length > 0 && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                  <p className="text-xs text-gray-500 mb-2">Current Documents</p>
                  <div className="space-y-2">
                    {courierData.courierProfile.documents.map((docItem: any) => (
                      <div key={docItem.url} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700">
                          {docItem.label}: {docItem.name}
                        </span>
                        <a
                          href={docItem.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:underline"
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
                <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {documents.governmentId && (
                  <p className="text-xs text-gray-500 mt-2">
                    Selected: {documents.governmentId.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {documents.vehicleRegistration && (
                  <p className="text-xs text-gray-500 mt-2">
                    Selected: {documents.vehicleRegistration.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
                {documents.insurance && (
                  <p className="text-xs text-gray-500 mt-2">
                    Selected: {documents.insurance.name}
                  </p>
                )}
              </div>

              <div className="text-xs text-gray-500">
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

        {/* Payments Section */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              💳 Payments
            </h2>
            <div className="space-y-3">
              <Link
                to="/earnings"
                className="flex items-center justify-between rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 px-6 py-4 font-semibold text-gray-900 hover:border-emerald-300 hover:from-emerald-100 hover:to-green-100 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">💵</span>
                  <div className="text-left">
                    <p className="font-bold">Earnings & Payouts</p>
                    <p className="text-xs text-gray-600">View your earnings history</p>
                  </div>
                </div>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>

              <Link
                to="/onboarding/stripe"
                className="flex items-center justify-between rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 px-6 py-4 font-semibold text-gray-900 hover:border-blue-300 hover:from-blue-100 hover:to-cyan-100 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏦</span>
                  <div className="text-left">
                    <p className="font-bold">Stripe Connect Setup</p>
                    <p className="text-xs text-gray-600">Connect your bank account</p>
                  </div>
                </div>
                <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Support Section */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              ❓ Help & Support
            </h2>
            <Link
              to="/support"
              className="flex items-center justify-between rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 px-6 py-4 font-semibold text-gray-900 hover:border-amber-300 hover:from-amber-100 hover:to-orange-100 transition-all group"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <div className="text-left">
                  <p className="font-bold">Contact Support</p>
                  <p className="text-xs text-gray-600">Get help with your account</p>
                </div>
              </div>
              <span className="text-2xl group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-white rounded-2xl border-2 border-red-200 overflow-hidden">
          <div className="p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-red-900 mb-6">
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
            <p className="text-xs text-gray-500 mt-3 text-center">
              You'll be logged out and returned to the login screen
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

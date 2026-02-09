import { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { DEFAULT_FEATURE_FLAGS } from "@gosenderr/shared";
import type { FeatureFlags } from "@gosenderr/shared";
import { db } from "../lib/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "../components/Card";
import { useAuth } from "../hooks/useAuth";

type SenderrplaceAdStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "active"
  | "paused"
  | "rejected"
  | "ended";

type BadgeVisibility = "public" | "private" | "admin_only";

type AdminAdRecord = {
  id: string;
  sellerId: string;
  itemId: string;
  placement: string;
  status: SenderrplaceAdStatus;
  disclosureLabel: string;
  budgetCents: number;
  dailyCapCents: number;
  createdAt?: unknown;
  startAt?: unknown;
  endAt?: unknown;
  rejectReason?: string;
};

type SellerBadgeRecord = {
  key: string;
  label: string;
  source: "system" | "admin";
  visibility: BadgeVisibility;
  awardedAt?: unknown;
  note?: string;
};

type SellerBadgeDoc = {
  id: string;
  sellerId: string;
  badges: SellerBadgeRecord[];
  updatedAt?: unknown;
  updatedBy?: string;
};

type CategoryKey = keyof FeatureFlags;

function isPermissionDenied(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "permission-denied"
  );
}

function formatLabel(value: string): string {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

const categoryOrder: CategoryKey[] = [
  "marketplace",
  "delivery",
  "courier",
  "seller",
  "customer",
  "packageRunner",
  "admin",
  "advanced",
  "ui",
  "senderrplaceV2",
];

const categoryIcons: Record<CategoryKey, string> = {
  marketplace: "🛒",
  delivery: "🚚",
  courier: "⚡",
  seller: "🏪",
  customer: "📦",
  packageRunner: "🚛",
  admin: "🛠️",
  advanced: "⚙️",
  ui: "🎨",
  senderrplaceV2: "🧭",
};

function normalizeFlags(flags: Partial<FeatureFlags> | null | undefined): FeatureFlags {
  const source = flags || {};

  return {
    marketplace: {
      ...DEFAULT_FEATURE_FLAGS.marketplace,
      ...(source.marketplace || {}),
    },
    delivery: {
      ...DEFAULT_FEATURE_FLAGS.delivery,
      ...(source.delivery || {}),
    },
    courier: {
      ...DEFAULT_FEATURE_FLAGS.courier,
      ...(source.courier || {}),
    },
    seller: {
      ...DEFAULT_FEATURE_FLAGS.seller,
      ...(source.seller || {}),
    },
    customer: {
      ...DEFAULT_FEATURE_FLAGS.customer,
      ...(source.customer || {}),
    },
    packageRunner: {
      ...DEFAULT_FEATURE_FLAGS.packageRunner,
      ...(source.packageRunner || {}),
    },
    admin: {
      ...DEFAULT_FEATURE_FLAGS.admin,
      ...(source.admin || {}),
    },
    advanced: {
      ...DEFAULT_FEATURE_FLAGS.advanced,
      ...(source.advanced || {}),
    },
    ui: {
      ...DEFAULT_FEATURE_FLAGS.ui,
      ...(source.ui || {}),
    },
    senderrplaceV2: {
      ...DEFAULT_FEATURE_FLAGS.senderrplaceV2,
      ...(source.senderrplaceV2 || {}),
    },
  };
}

function formatMoneyFromCents(cents: number): string {
  return `$${(Number(cents || 0) / 100).toFixed(2)}`;
}

function formatDate(value: unknown): string {
  if (!value) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      const dateValue = (value as { toDate: () => Date }).toDate();
      return dateValue.toLocaleString();
    } catch (_error) {
      return "—";
    }
  }
  return "—";
}

export default function FeatureFlagsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [editedFlags, setEditedFlags] = useState<FeatureFlags | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ads, setAds] = useState<AdminAdRecord[]>([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [adActionError, setAdActionError] = useState<string | null>(null);
  const [badges, setBadges] = useState<SellerBadgeDoc[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [badgeActionError, setBadgeActionError] = useState<string | null>(null);
  const [badgeSellerId, setBadgeSellerId] = useState("");
  const [badgeKey, setBadgeKey] = useState("");
  const [badgeLabel, setBadgeLabel] = useState("");
  const [badgeVisibility, setBadgeVisibility] = useState<BadgeVisibility>("public");
  const [badgeNote, setBadgeNote] = useState("");
  const [badgeSaving, setBadgeSaving] = useState(false);

  useEffect(() => {
    const ref = doc(db, "featureFlags", "config");
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          const config = normalizeFlags(snapshot.data() as FeatureFlags);
          setFlags(config);
          setEditedFlags(config);
        } else {
          setFlags(DEFAULT_FEATURE_FLAGS);
          setEditedFlags(DEFAULT_FEATURE_FLAGS);
        }
        setLoading(false);
      },
      (snapshotError) => {
        console.error("Error loading feature flags:", snapshotError);
        setError("Failed to load feature flags.");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const adsQuery = query(
      collection(db, "senderrplaceAds"),
      orderBy("createdAt", "desc"),
      limit(100),
    );
    const unsubscribe = onSnapshot(
      adsQuery,
      (snapshot) => {
        const nextAds = snapshot.docs.map((adDoc) => {
          const data = adDoc.data() as Record<string, unknown>;
          return {
            id: adDoc.id,
            sellerId: String(data.sellerId || ""),
            itemId: String(data.itemId || ""),
            placement: String(data.placement || "top_feed"),
            status: (data.status || "draft") as SenderrplaceAdStatus,
            disclosureLabel: String(data.disclosureLabel || "Sponsored"),
            budgetCents: Number(data.budgetCents || 0),
            dailyCapCents: Number(data.dailyCapCents || 0),
            createdAt: data.createdAt,
            startAt: data.startAt,
            endAt: data.endAt,
            rejectReason: data.rejectReason ? String(data.rejectReason) : undefined,
          } as AdminAdRecord;
        });

        setAds(nextAds);
        setAdsLoading(false);
        setAdActionError(null);
      },
      (snapshotError) => {
        console.error("Error loading senderrplace ads:", snapshotError);
        if (isPermissionDenied(snapshotError)) {
          setAdActionError("Ads require admin access.");
          setAdsLoading(false);
          return;
        }
        setAdActionError("Failed to load ads.");
        setAdsLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const badgesQuery = query(
      collection(db, "senderrplaceSellerBadges"),
      orderBy("updatedAt", "desc"),
      limit(100),
    );
    const unsubscribe = onSnapshot(
      badgesQuery,
      (snapshot) => {
        const nextDocs = snapshot.docs.map((badgeDoc) => {
          const data = badgeDoc.data() as Record<string, unknown>;
          const badgeEntries = Array.isArray(data.badges)
            ? (data.badges as SellerBadgeRecord[])
            : [];

          return {
            id: badgeDoc.id,
            sellerId: String(data.sellerId || badgeDoc.id),
            badges: badgeEntries,
            updatedAt: data.updatedAt,
            updatedBy: data.updatedBy ? String(data.updatedBy) : undefined,
          } as SellerBadgeDoc;
        });

        setBadges(nextDocs);
        setBadgesLoading(false);
        setBadgeActionError(null);
      },
      (snapshotError) => {
        console.error("Error loading seller badges:", snapshotError);
        if (isPermissionDenied(snapshotError)) {
          setBadgeActionError("Seller badge overrides require admin access.");
          setBadgesLoading(false);
          return;
        }
        setBadgeActionError("Failed to load badge overrides.");
        setBadgesLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  const hasChanges = useMemo(
    () => JSON.stringify(flags) !== JSON.stringify(editedFlags),
    [flags, editedFlags],
  );

  const toggleFlag = (category: CategoryKey, key: string) => {
    if (!editedFlags) return;
    const section = editedFlags[category] as Record<string, boolean>;
    const current = Boolean(section[key]);

    setEditedFlags({
      ...editedFlags,
      [category]: {
        ...section,
        [key]: !current,
      },
    });
  };

  const initializeDefaults = async () => {
    setSaving(true);
    setError(null);
    try {
      await setDoc(doc(db, "featureFlags", "config"), {
        ...normalizeFlags(DEFAULT_FEATURE_FLAGS),
        updatedAt: serverTimestamp(),
      });
    } catch (initError) {
      console.error("Error initializing feature flags:", initError);
      setError("Failed to initialize feature flags.");
    } finally {
      setSaving(false);
    }
  };

  const saveFlags = async () => {
    if (!editedFlags) return;
    setSaving(true);
    setError(null);
    try {
      await setDoc(doc(db, "featureFlags", "config"), {
        ...editedFlags,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      setFlags(editedFlags);
    } catch (saveError) {
      console.error("Error saving feature flags:", saveError);
      setError("Failed to save feature flags.");
    } finally {
      setSaving(false);
    }
  };

  const updateAdStatus = async (
    ad: AdminAdRecord,
    status: SenderrplaceAdStatus,
    rejectReason?: string,
  ) => {
    setAdActionError(null);
    try {
      await updateDoc(doc(db, "senderrplaceAds", ad.id), {
        status,
        reviewedAt: serverTimestamp(),
        reviewedBy: user?.uid || "admin-web",
        rejectReason: status === "rejected" ? rejectReason || ad.rejectReason || "Rejected by admin" : null,
        updatedAt: serverTimestamp(),
      });
    } catch (updateError) {
      console.error("Error updating ad status:", updateError);
      setAdActionError("Failed to update ad status.");
    }
  };

  const addBadgeOverride = async () => {
    const sellerId = badgeSellerId.trim();
    const key = badgeKey.trim();
    const label = badgeLabel.trim() || formatLabel(key);

    if (!sellerId || !key) {
      setBadgeActionError("Seller ID and badge key are required.");
      return;
    }

    setBadgeSaving(true);
    setBadgeActionError(null);
    try {
      const ref = doc(db, "senderrplaceSellerBadges", sellerId);
      const snapshot = await getDoc(ref);
      const existing = snapshot.exists()
        ? ((snapshot.data().badges as SellerBadgeRecord[]) || [])
        : [];
      const filtered = existing.filter((badge) => badge.key !== key);
      const nextBadge: SellerBadgeRecord = {
        key,
        label,
        source: "admin",
        visibility: badgeVisibility,
        note: badgeNote.trim() || undefined,
      };

      await setDoc(
        ref,
        {
          sellerId,
          badges: [nextBadge, ...filtered],
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || "admin-web",
        },
        { merge: true },
      );

      setBadgeSellerId("");
      setBadgeKey("");
      setBadgeLabel("");
      setBadgeNote("");
      setBadgeVisibility("public");
    } catch (saveError) {
      console.error("Error saving badge override:", saveError);
      setBadgeActionError("Failed to save badge override.");
    } finally {
      setBadgeSaving(false);
    }
  };

  const updateBadgeVisibility = async (
    sellerDoc: SellerBadgeDoc,
    badgeKeyValue: string,
    visibility: BadgeVisibility,
  ) => {
    setBadgeActionError(null);
    try {
      const nextBadges = sellerDoc.badges.map((badge) =>
        badge.key === badgeKeyValue ? { ...badge, visibility } : badge,
      );

      await setDoc(
        doc(db, "senderrplaceSellerBadges", sellerDoc.id),
        {
          sellerId: sellerDoc.sellerId,
          badges: nextBadges,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || "admin-web",
        },
        { merge: true },
      );
    } catch (updateError) {
      console.error("Error updating badge visibility:", updateError);
      setBadgeActionError("Failed to update badge visibility.");
    }
  };

  const removeBadge = async (sellerDoc: SellerBadgeDoc, badgeKeyValue: string) => {
    setBadgeActionError(null);
    try {
      const nextBadges = sellerDoc.badges.filter((badge) => badge.key !== badgeKeyValue);
      await setDoc(
        doc(db, "senderrplaceSellerBadges", sellerDoc.id),
        {
          sellerId: sellerDoc.sellerId,
          badges: nextBadges,
          updatedAt: serverTimestamp(),
          updatedBy: user?.uid || "admin-web",
        },
        { merge: true },
      );
    } catch (updateError) {
      console.error("Error removing badge:", updateError);
      setBadgeActionError("Failed to remove badge.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!editedFlags) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <Card variant="elevated" className="max-w-lg">
          <CardContent className="p-6 space-y-4 text-center">
            <p className="text-gray-700">Feature flags config is missing.</p>
            <button
              onClick={initializeDefaults}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? "Initializing..." : "Initialize Defaults"}
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🎚️ Feature Flags</h1>
          <p className="text-purple-100">Canonical control plane for platform and Senderrplace V2 rollout</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-6">
        {(hasChanges || error) && (
          <Card variant="elevated">
            <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                {hasChanges && <p className="font-semibold text-amber-800">Unsaved flag changes detected.</p>}
                {error && <p className="font-semibold text-red-700">{error}</p>}
              </div>
              <button
                onClick={saveFlags}
                disabled={saving || !hasChanges}
                className="px-5 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </CardContent>
          </Card>
        )}

        {categoryOrder.map((category) => {
          const section = editedFlags[category] as Record<string, boolean>;
          const entries = Object.entries(section);

          return (
            <Card key={category} variant="elevated">
              <CardHeader>
                <CardTitle>
                  {categoryIcons[category]} {formatLabel(category)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {entries.map(([key, value]) => (
                    <div
                      key={`${category}.${key}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-white"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{formatLabel(key)}</p>
                        <p className="text-xs text-gray-500">{category}.{key}</p>
                      </div>
                      <button
                        onClick={() => toggleFlag(category, key)}
                        className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                          value ? "bg-green-500" : "bg-gray-300"
                        }`}
                        aria-label={`toggle ${category}.${key}`}
                      >
                        <span
                          className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                            value ? "translate-x-9" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>📣 Senderrplace Ads Moderation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {adActionError && (
              <p className="text-sm font-semibold text-red-700">{adActionError}</p>
            )}
            {adsLoading ? (
              <p className="text-sm text-gray-500">Loading ads...</p>
            ) : ads.length === 0 ? (
              <p className="text-sm text-gray-500">No ads found.</p>
            ) : (
              <div className="space-y-3">
                {ads.map((ad) => (
                  <div
                    key={ad.id}
                    className="rounded-lg border border-gray-200 bg-white p-3 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700">
                        {ad.disclosureLabel || "Sponsored"}
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-blue-100 text-blue-700">
                        {ad.placement}
                      </span>
                      <span className="text-xs font-semibold px-2 py-1 rounded bg-purple-100 text-purple-700">
                        {ad.status}
                      </span>
                    </div>

                    <p className="text-sm text-gray-800">
                      Seller: <span className="font-mono">{ad.sellerId}</span> • Item:{" "}
                      <span className="font-mono">{ad.itemId}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      Budget {formatMoneyFromCents(ad.budgetCents)} • Daily cap{" "}
                      {formatMoneyFromCents(ad.dailyCapCents)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Start {formatDate(ad.startAt)} • End {formatDate(ad.endAt)} • Created{" "}
                      {formatDate(ad.createdAt)}
                    </p>
                    {ad.rejectReason && (
                      <p className="text-xs text-red-600">Reject reason: {ad.rejectReason}</p>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateAdStatus(ad, "approved")}
                        className="px-3 py-1.5 text-xs rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateAdStatus(ad, "active")}
                        className="px-3 py-1.5 text-xs rounded-lg bg-green-100 text-green-700 hover:bg-green-200"
                      >
                        Activate
                      </button>
                      <button
                        onClick={() => updateAdStatus(ad, "paused")}
                        className="px-3 py-1.5 text-xs rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                      >
                        Pause
                      </button>
                      <button
                        onClick={() => updateAdStatus(ad, "rejected", "Rejected by admin review")}
                        className="px-3 py-1.5 text-xs rounded-lg bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>🛡️ Seller Badge Overrides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {badgeActionError && (
              <p className="text-sm font-semibold text-red-700">{badgeActionError}</p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
              <input
                value={badgeSellerId}
                onChange={(event) => setBadgeSellerId(event.target.value)}
                placeholder="Seller UID"
                className="md:col-span-2 px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                value={badgeKey}
                onChange={(event) => setBadgeKey(event.target.value)}
                placeholder="Badge key (ex: verified)"
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                value={badgeLabel}
                onChange={(event) => setBadgeLabel(event.target.value)}
                placeholder="Badge label"
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <select
                value={badgeVisibility}
                onChange={(event) => setBadgeVisibility(event.target.value as BadgeVisibility)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="public">public</option>
                <option value="private">private</option>
                <option value="admin_only">admin_only</option>
              </select>
              <button
                onClick={addBadgeOverride}
                disabled={badgeSaving}
                className="px-3 py-2 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 disabled:opacity-50"
              >
                {badgeSaving ? "Saving..." : "Add/Update"}
              </button>
            </div>
            <input
              value={badgeNote}
              onChange={(event) => setBadgeNote(event.target.value)}
              placeholder="Optional note"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />

            {badgesLoading ? (
              <p className="text-sm text-gray-500">Loading badge overrides...</p>
            ) : badges.length === 0 ? (
              <p className="text-sm text-gray-500">No badge overrides found.</p>
            ) : (
              <div className="space-y-3">
                {badges.map((sellerDoc) => (
                  <div
                    key={sellerDoc.id}
                    className="rounded-lg border border-gray-200 bg-white p-3 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900">
                        Seller: <span className="font-mono">{sellerDoc.sellerId}</span>
                      </p>
                      <p className="text-xs text-gray-500">
                        Updated {formatDate(sellerDoc.updatedAt)} by {sellerDoc.updatedBy || "system"}
                      </p>
                    </div>

                    {sellerDoc.badges.length === 0 ? (
                      <p className="text-xs text-gray-500">No badges assigned.</p>
                    ) : (
                      <div className="space-y-2">
                        {sellerDoc.badges.map((badge) => (
                          <div
                            key={`${sellerDoc.id}.${badge.key}`}
                            className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-100 p-2"
                          >
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {badge.label} <span className="text-xs text-gray-500">({badge.key})</span>
                              </p>
                              <p className="text-xs text-gray-500">
                                source: {badge.source} • visibility: {badge.visibility}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              <button
                                onClick={() => updateBadgeVisibility(sellerDoc, badge.key, "public")}
                                className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200"
                              >
                                Public
                              </button>
                              <button
                                onClick={() => updateBadgeVisibility(sellerDoc, badge.key, "private")}
                                className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
                              >
                                Private
                              </button>
                              <button
                                onClick={() => updateBadgeVisibility(sellerDoc, badge.key, "admin_only")}
                                className="px-2 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
                              >
                                Admin Only
                              </button>
                              <button
                                onClick={() => removeBadge(sellerDoc, badge.key)}
                                className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
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

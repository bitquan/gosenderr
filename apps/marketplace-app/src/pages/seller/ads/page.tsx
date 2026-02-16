import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Timestamp,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuthUser } from "@/hooks/v2/useAuthUser";
import {
  commitTokenAction,
  getTokenWallet,
  makeIdempotencyKey,
  releaseTokenAction,
  reserveTokenAction,
  type TokenPolicySnapshot,
} from "@/lib/tokens";

type Placement = "boost" | "featured";

interface SellerItem {
  id: string;
  title: string;
  status: string;
  isActive: boolean;
  photos?: string[];
  views?: number;
  boostedUntil?: Timestamp;
  adBoost?: {
    placement?: Placement;
    endAt?: Timestamp;
    active?: boolean;
  };
}

interface ListingBoost {
  id: string;
  itemId: string;
  placement: Placement;
  durationDays: number;
  status: "active" | "expired";
  createdAt?: Timestamp;
  endAt?: Timestamp;
}

function toMillis(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof (value as any)?.toMillis === "function") return (value as any).toMillis();
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

export default function SellerAdsPage() {
  const { uid } = useAuthUser();
  const [items, setItems] = useState<SellerItem[]>([]);
  const [boosts, setBoosts] = useState<ListingBoost[]>([]);
  const [policy, setPolicy] = useState<TokenPolicySnapshot | null>(null);
  const [walletTokens, setWalletTokens] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedItemId, setSelectedItemId] = useState("");
  const [placement, setPlacement] = useState<Placement>("boost");
  const [durationDays, setDurationDays] = useState(7);

  const loadData = async () => {
    if (!uid) return;
    setLoading(true);
    setError(null);

    try {
      const [itemsSnapshot, boostsSnapshot, walletSnapshot] = await Promise.all([
        getDocs(query(collection(db, "marketplaceItems"), where("sellerId", "==", uid))),
        getDocs(query(collection(db, "listingAdBoosts"), where("sellerId", "==", uid))),
        getTokenWallet(),
      ]);

      const activeItems = itemsSnapshot.docs
        .map((itemDoc) => ({
          id: itemDoc.id,
          ...(itemDoc.data() as SellerItem),
        }))
        .filter((item) => item.status === "active" && item.isActive !== false);

      const boostRows = boostsSnapshot.docs
        .map((boostDoc) => ({
          id: boostDoc.id,
          ...(boostDoc.data() as Omit<ListingBoost, "id">),
        }))
        .sort((a, b) => toMillis(b.createdAt) - toMillis(a.createdAt));

      setItems(activeItems);
      setBoosts(boostRows);
      setWalletTokens(walletSnapshot.wallet.available);
      setPolicy(walletSnapshot.policy);

      if (!selectedItemId && activeItems.length > 0) {
        setSelectedItemId(activeItems[0].id);
      }
    } catch (loadError) {
      console.error("Failed loading seller ad boost data:", loadError);
      setError("Failed to load ad boost data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [uid]);

  useEffect(() => {
    if (placement === "featured") {
      setDurationDays(7);
    }
  }, [placement]);

  const requiredTokens = useMemo(() => {
    const costs = policy?.costs || {};
    if (placement === "featured") {
      return Number(costs.adFeatured7d || 120);
    }
    if (durationDays >= 30) return Number(costs.adBoost30d || 80);
    if (durationDays >= 7) return Number(costs.adBoost7d || 25);
    return Number(costs.adBoost24h || 5);
  }, [durationDays, placement, policy]);

  const selectedItem = items.find((item) => item.id === selectedItemId) || null;
  const canSubmit =
    !!selectedItem &&
    !submitting &&
    requiredTokens >= 0 &&
    (walletTokens >= requiredTokens || requiredTokens === 0);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!uid || !selectedItem) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const idempotencyKey = makeIdempotencyKey("seller_ad_boost");
    let reservationId: string | null = null;

    try {
      const reserveResult = await reserveTokenAction({
        actorType: "seller",
        action: "ad_boost",
        referenceId: `adboost:${selectedItem.id}:${Date.now()}`,
        idempotencyKey,
        metadata: {
          itemId: selectedItem.id,
          placement,
          durationDays,
        },
      });

      if (reserveResult.status === "reserved" && reserveResult.reservationId) {
        reservationId = reserveResult.reservationId;
      }

      const startAt = Timestamp.now();
      const endAt = Timestamp.fromMillis(
        startAt.toMillis() + durationDays * 24 * 60 * 60 * 1000,
      );

      const boostRef = doc(collection(db, "listingAdBoosts"));
      const itemRef = doc(db, "marketplaceItems", selectedItem.id);
      const batch = writeBatch(db);

      batch.set(boostRef, {
        id: boostRef.id,
        sellerId: uid,
        itemId: selectedItem.id,
        placement,
        durationDays,
        status: "active",
        requiredTokens,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        startAt,
        endAt,
      });

      batch.update(itemRef, {
        boostScore: placement === "featured" ? 2 : 1,
        boostedUntil: endAt,
        adBoost: {
          boostId: boostRef.id,
          placement,
          durationDays,
          active: true,
          startAt,
          endAt,
          requiredTokens,
        },
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      if (reservationId) {
        const commitResult = await commitTokenAction({
          reservationId,
          idempotencyKey,
        });
        setWalletTokens(commitResult.wallet.available);
      }

      setSuccess("Ad boost activated. Your listing will rank higher while the boost is active.");
      await loadData();
    } catch (submitError) {
      console.error("Failed creating ad boost:", submitError);
      if (reservationId) {
        try {
          const releaseResult = await releaseTokenAction({
            reservationId,
            idempotencyKey,
          });
          setWalletTokens(releaseResult.wallet.available);
        } catch (releaseError) {
          console.error("Failed releasing ad boost reservation:", releaseError);
        }
      }
      setError(submitError instanceof Error ? submitError.message : "Failed to create ad boost.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Ad Boost Manager</h1>
              <p className="text-blue-100">Promote listings with Senderr tokens</p>
            </div>
            <Link
              to="/seller/dashboard"
              className="px-5 py-2 bg-white/20 rounded-lg font-semibold hover:bg-white/30"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Create boost</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Listing</label>
              <select
                value={selectedItemId}
                onChange={(event) => setSelectedItemId(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                required
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              {items.length === 0 && (
                <p className="text-sm text-red-600 mt-2">
                  No active listings found. Create a listing first.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Placement</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPlacement("boost")}
                  className={`rounded-lg border px-4 py-3 text-left ${
                    placement === "boost"
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-gray-300 text-gray-700"
                  }`}
                >
                  <div className="font-semibold">Boost</div>
                  <div className="text-xs mt-1">Higher browse ranking</div>
                </button>
                <button
                  type="button"
                  onClick={() => setPlacement("featured")}
                  className={`rounded-lg border px-4 py-3 text-left ${
                    placement === "featured"
                      ? "border-purple-600 bg-purple-50 text-purple-900"
                      : "border-gray-300 text-gray-700"
                  }`}
                >
                  <div className="font-semibold">Featured</div>
                  <div className="text-xs mt-1">Top priority placement</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Duration</label>
              <div className="flex gap-2 flex-wrap">
                {(placement === "featured" ? [7] : [1, 7, 30]).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setDurationDays(days)}
                    className={`px-3 py-2 rounded-lg border text-sm font-semibold ${
                      durationDays === days
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900"
                        : "border-gray-300 text-gray-700"
                    }`}
                  >
                    {days === 1 ? "24h" : `${days} days`}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <p className="font-semibold">
                Cost: {requiredTokens} token{requiredTokens === 1 ? "" : "s"}
              </p>
              <p className="text-sm mt-1">Wallet: {walletTokens} tokens available</p>
            </div>

            {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">{error}</div>}
            {success && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-green-700">{success}</div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full rounded-lg bg-blue-600 text-white py-3 font-semibold hover:bg-blue-700 disabled:bg-gray-400"
            >
              {submitting ? "Activating boost..." : "Activate boost"}
            </button>
          </form>
        </section>

        <section className="bg-white rounded-2xl shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent boosts</h2>
          {boosts.length === 0 ? (
            <p className="text-gray-600 text-sm">No boosts yet.</p>
          ) : (
            <div className="space-y-3">
              {boosts.slice(0, 10).map((boost) => (
                <div key={boost.id} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">
                      {boost.placement === "featured" ? "Featured" : "Boost"} • {boost.durationDays}d
                    </p>
                    <span className="text-xs text-gray-500 uppercase">{boost.status}</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">Listing: {boost.itemId}</p>
                  {boost.endAt && (
                    <p className="text-xs text-gray-500 mt-1">
                      Ends {new Date(toMillis(boost.endAt)).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

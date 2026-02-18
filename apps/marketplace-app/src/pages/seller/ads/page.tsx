import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, Timestamp, updateDoc, where, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'
import { useAuthUser } from '@/hooks/v2/useAuthUser'
import type { MarketplaceItem } from '@/types/marketplace'
import {
  commitUtilityTokens,
  getTokenPolicyForMarketplace,
  getUtilityTokenWalletSummary,
  releaseUtilityTokens,
  reserveUtilityTokens,
} from '@/services/tokenAds.service'

export default function SellerAdsPage() {
  const { uid } = useAuthUser()
  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [walletLoading, setWalletLoading] = useState(true)
  const [boostingItemId, setBoostingItemId] = useState<string | null>(null)
  const [availableTokens, setAvailableTokens] = useState(0)
  const [boostCost, setBoostCost] = useState(2)

  const activeItems = useMemo(
    () => items.filter((item) => item.status === 'active' && item.isActive),
    [items],
  )

  useEffect(() => {
    if (!uid) return
    loadData()
  }, [uid])

  const loadData = async () => {
    if (!uid) return

    setLoading(true)
    setWalletLoading(true)
    try {
      const [itemsSnap, wallet, policy] = await Promise.all([
        getDocs(query(collection(db, 'marketplaceItems'), where('sellerId', '==', uid))),
        getUtilityTokenWalletSummary(),
        getTokenPolicyForMarketplace(),
      ])

      const sellerItems = itemsSnap.docs.map((itemDoc) => ({
        id: itemDoc.id,
        ...itemDoc.data(),
      })) as MarketplaceItem[]

      setItems(sellerItems)
      setAvailableTokens(Math.max(wallet.available ?? 0, 0))
      setBoostCost(Math.max(Number(policy?.costs?.listingPublish ?? 2), 1))
    } catch (error) {
      console.error('Failed to load ad dashboard data:', error)
    } finally {
      setLoading(false)
      setWalletLoading(false)
    }
  }

  const getBoostedUntilDate = (item: MarketplaceItem): Date | null => {
    const boostedUntil = item.adBoost?.boostedUntil as any
    return boostedUntil?.toDate?.() ?? (boostedUntil ? new Date(boostedUntil) : null)
  }

  const isCurrentlyBoosted = (item: MarketplaceItem): boolean => {
    const boostDate = getBoostedUntilDate(item)
    return Boolean(boostDate && boostDate.getTime() > Date.now())
  }

  const boostListing = async (item: MarketplaceItem, tier: 'standard' | 'spotlight') => {
    const tokenCost = tier === 'spotlight' ? boostCost * 2 : boostCost

    if (availableTokens < tokenCost) {
      alert(`Not enough tokens. You need ${tokenCost} tokens for this boost.`)
      return
    }

    setBoostingItemId(item.id)
    let reservationId: string | null = null

    try {
      const reservation = await reserveUtilityTokens({
        action: 'listingBoost',
        amount: tokenCost,
        metadata: {
          itemId: item.id,
          tier,
        },
      })
      reservationId = reservation.reservationId

      const currentBoostUntil = getBoostedUntilDate(item)
      const now = Date.now()
      const baseTime = currentBoostUntil && currentBoostUntil.getTime() > now
        ? currentBoostUntil.getTime()
        : now
      const boostedUntil = new Date(baseTime + 24 * 60 * 60 * 1000)

      await updateDoc(doc(db, 'marketplaceItems', item.id), {
        adBoost: {
          tier,
          boostedUntil: Timestamp.fromDate(boostedUntil),
          lastBoostAt: Timestamp.now(),
          totalSpentTokens: (item.adBoost?.totalSpentTokens || 0) + tokenCost,
        },
        updatedAt: Timestamp.now(),
      })

      await commitUtilityTokens({
        reservationId,
        metadata: {
          itemId: item.id,
          tier,
          tokenCost,
        },
      })

      await loadData()
    } catch (error) {
      console.error('Failed to boost listing:', error)
      if (reservationId) {
        try {
          await releaseUtilityTokens({
            reservationId,
            reason: 'listing_boost_failed',
            metadata: {
              itemId: item.id,
              tier,
            },
          })
        } catch {
          // no-op best effort
        }
      }
      alert('Failed to boost listing. Please try again.')
    } finally {
      setBoostingItemId(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-purple-300 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-950/70 p-4 text-white shadow-2xl backdrop-blur md:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ad Dashboard</h1>
          <p className="mt-1 text-sm text-purple-200">Use tokens to boost your listings in sponsored placement.</p>
        </div>
        <Link
          to="/seller/dashboard"
          className="rounded-xl border border-white/20 px-3 py-2 text-sm text-white/90 hover:bg-white/10"
        >
          Back
        </Link>
      </div>

      <div className="mb-5 rounded-2xl border border-purple-300/30 bg-purple-500/10 p-4">
        <div className="text-xs uppercase tracking-[0.2em] text-purple-200">Utility tokens</div>
        <div className="mt-1 text-3xl font-bold">{walletLoading ? '…' : availableTokens}</div>
        <div className="mt-2 text-sm text-purple-100">
          Standard boost: {boostCost} tokens • Spotlight boost: {boostCost * 2} tokens
        </div>
      </div>

      {activeItems.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-center">
          <div className="text-4xl">📢</div>
          <p className="mt-3 text-white/90">No active listings to boost yet.</p>
          <Link
            to="/seller/items/new"
            className="mt-4 inline-flex rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900"
          >
            Create listing
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {activeItems.map((item) => {
            const boosted = isCurrentlyBoosted(item)
            const boostedUntil = getBoostedUntilDate(item)
            const busy = boostingItemId === item.id
            return (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-semibold">{item.title}</div>
                    <div className="mt-1 text-sm text-purple-200">
                      {boosted && boostedUntil
                        ? `Boosted until ${boostedUntil.toLocaleString()}`
                        : 'Not currently boosted'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => boostListing(item, 'standard')}
                      className="rounded-xl border border-white/20 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-60"
                    >
                      {busy ? 'Working...' : `Boost +1 day (${boostCost})`}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => boostListing(item, 'spotlight')}
                      className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 disabled:opacity-60"
                    >
                      {busy ? 'Working...' : `Spotlight +1 day (${boostCost * 2})`}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

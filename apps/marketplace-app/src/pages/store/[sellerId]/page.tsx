import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Timestamp, doc, getDoc } from 'firebase/firestore'

import { ItemGrid } from '../../../components/marketplace/ItemGrid'
import { SellerBadgeList } from '../../../components/marketplace/SellerBadge'
import { useAuth } from '../../../contexts/AuthContext'
import { db, isFirebaseReady } from '../../../lib/firebase/client'
import { marketplaceService } from '../../../services/marketplace.service'
import type { MarketplaceItem } from '../../../types/marketplace'

interface SellerStorefront {
  id: string
  name: string
  photoURL: string
  bio: string
  city: string
  state: string
  badges: string[]
  rating: number | null
  ratingCount: number
  totalSales: number
  activeListings: number
  joinedAt: Date | null
}

const asDate = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Timestamp) return value.toDate()
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as any).toDate === 'function') {
    return (value as any).toDate()
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

const formatMemberSince = (joinedAt: Date | null) => {
  if (!joinedAt) return 'Unknown'
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(joinedAt)
}

export default function SellerStorefrontPage() {
  const { sellerId } = useParams<{ sellerId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [storefront, setStorefront] = useState<SellerStorefront | null>(null)

  useEffect(() => {
    if (!sellerId) return
    void fetchStorefront(sellerId)
  }, [sellerId])

  const fetchStorefront = async (id: string) => {
    setLoading(true)
    setNotFound(false)
    setError(null)
    try {
      if (!isFirebaseReady()) {
        setError('Storefront is temporarily unavailable. Please verify Firebase config and retry.')
        return
      }

      const userSnapshot = await getDoc(doc(db, 'users', id))
      if (!userSnapshot.exists()) {
        setNotFound(true)
        return
      }

      const userData = userSnapshot.data() as Record<string, any>
      const sellerProfile = (userData.sellerProfile || {}) as Record<string, any>
      const sellerListings = await marketplaceService.getSellerListings(id)
      const activeListings = sellerListings.filter((item) => item.isActive && item.status === 'active')

      const ratingRaw = sellerProfile.ratingAvg ?? sellerProfile.rating
      const rating = typeof ratingRaw === 'number' ? ratingRaw : null
      const ratingCount = typeof sellerProfile.ratingCount === 'number' ? sellerProfile.ratingCount : 0
      const badges = Array.isArray(sellerProfile.badges) ? sellerProfile.badges : []

      setStorefront({
        id,
        name: sellerProfile.businessName || userData.displayName || 'Senderr Seller',
        photoURL: userData.profilePhotoUrl || userData.photoURL || '',
        bio: userData.bio || sellerProfile.description || 'Trusted seller on Senderrplace.',
        city: userData.city || '',
        state: userData.state || '',
        badges,
        rating,
        ratingCount,
        totalSales: typeof sellerProfile.totalSales === 'number' ? sellerProfile.totalSales : 0,
        activeListings: activeListings.length,
        joinedAt: asDate(sellerProfile.joinedAsSellerAt) || asDate(userData.createdAt),
      })
      setItems(activeListings)
    } catch (storefrontError) {
      console.error('Failed to load storefront:', storefrontError)
      setError('Could not load this storefront right now. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return items
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term)
    )
  }, [items, search])

  const sellerBadgesMap = useMemo(
    () => (storefront ? { [storefront.id]: storefront.badges } : {}),
    [storefront]
  )

  const sellerRatingsMap = useMemo(() => {
    if (!storefront || storefront.rating === null || storefront.ratingCount < 1) {
      return {}
    }
    return {
      [storefront.id]: {
        average: storefront.rating,
        count: storefront.ratingCount,
      },
    }
  }, [storefront])

  const handleMessageSeller = () => {
    if (!storefront) return
    if (!user) {
      navigate('/login')
      return
    }
    navigate(`/messages?user=${storefront.id}`)
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="animate-pulse space-y-6">
          <div className="h-5 w-44 rounded bg-white/20" />
          <div className="h-48 rounded-3xl bg-white/10" />
          <div className="h-10 rounded-2xl bg-white/10" />
          <div className="h-80 rounded-2xl bg-white/10" />
        </div>
      </div>
    )
  }

  if (notFound || !sellerId) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center text-white">
        <h1 className="text-3xl font-bold">Storefront not found</h1>
        <p className="mt-3 text-white/75">This seller profile is unavailable.</p>
        <Link
          to="/marketplace"
          className="inline-flex mt-6 rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Back to Senderrplace
        </Link>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center text-white">
        <h1 className="text-3xl font-bold">Storefront unavailable</h1>
        <p className="mt-3 text-white/75">{error}</p>
        <button
          onClick={() => fetchStorefront(sellerId)}
          className="inline-flex mt-6 rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!storefront) return null

  const location = [storefront.city, storefront.state].filter(Boolean).join(', ')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-white">
      <Link to="/marketplace" className="inline-flex items-center gap-2 text-sm text-white/75 hover:text-white mb-4">
        <span>←</span>
        <span>Back to Senderrplace</span>
      </Link>

      <section className="rounded-3xl border border-white/15 bg-gradient-to-br from-blue-900/80 via-indigo-900/70 to-purple-900/80 shadow-2xl p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            {storefront.photoURL ? (
              <img src={storefront.photoURL} alt={storefront.name} className="h-20 w-20 rounded-full border border-white/30 object-cover" />
            ) : (
              <div className="h-20 w-20 rounded-full border border-white/30 bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-2xl font-bold">
                {storefront.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <h1 className="text-3xl font-bold tracking-tight">{storefront.name}</h1>
              <p className="mt-2 max-w-2xl text-white/80">{storefront.bio}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-white/70">
                <span>Member since {formatMemberSince(storefront.joinedAt)}</span>
                {location ? <span>{location}</span> : null}
              </div>
              {storefront.badges.length > 0 ? (
                <div className="mt-4">
                  <SellerBadgeList badges={storefront.badges as any} size="sm" showLabel maxDisplay={6} />
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:min-w-[220px]">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-white/60">Rating</div>
              <div className="text-xl font-bold">
                {storefront.rating !== null && storefront.ratingCount > 0
                  ? `${storefront.rating.toFixed(1)} (${storefront.ratingCount})`
                  : 'New seller'}
              </div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3">
              <div className="text-xs uppercase tracking-wide text-white/60">Sales</div>
              <div className="text-xl font-bold">{storefront.totalSales}</div>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 col-span-2">
              <div className="text-xs uppercase tracking-wide text-white/60">Active listings</div>
              <div className="text-xl font-bold">{storefront.activeListings}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={handleMessageSeller}
            className="inline-flex rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
          >
            Message seller
          </button>
          <Link
            to="/marketplace"
            className="inline-flex rounded-2xl border border-white/30 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Keep shopping
          </Link>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Store catalog</h2>
            <p className="text-sm text-white/70">
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} available
            </p>
          </div>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search this store..."
            className="w-full md:w-80 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-white placeholder-white/60 outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-400/40"
          />
        </div>

        <div className="mt-5">
          <ItemGrid items={filteredItems} sellerBadgesMap={sellerBadgesMap} sellerRatingsMap={sellerRatingsMap} />
        </div>
      </section>
    </div>
  )
}

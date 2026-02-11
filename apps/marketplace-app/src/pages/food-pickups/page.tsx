import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { AddressAutocomplete } from '@/components/AddressAutocomplete'
import { useAuthUser } from '@/hooks/v2/useAuthUser'
import { createFoodPickupRestaurantFromMarketplace, useFoodPickupRestaurants } from '@/lib/foodPickup'
import { FoodPickupRestaurantDoc } from '@gosenderr/shared'

function formatTags(tags: string[]) {
  if (!tags.length) return 'Everyday favorites'
  return tags.map((tag) => tag.toUpperCase()).join(' · ')
}

export default function FoodPickupsPage() {
  const navigate = useNavigate()
  const { user, uid } = useAuthUser()
  const { restaurants, loading, refresh } = useFoodPickupRestaurants()
  const [addingRestaurant, setAddingRestaurant] = useState(false)
  const [savingRestaurant, setSavingRestaurant] = useState(false)
  const [restaurantName, setRestaurantName] = useState('')
  const [pickupAddress, setPickupAddress] = useState('')
  const [pickupLat, setPickupLat] = useState<number | null>(null)
  const [pickupLng, setPickupLng] = useState<number | null>(null)
  const [cuisineTags, setCuisineTags] = useState('')
  const [pickupHours, setPickupHours] = useState('')
  const [notes, setNotes] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [formMessage, setFormMessage] = useState<string | null>(null)

  const heroStats = useMemo(() => {
    const restaurantsReady = restaurants.length
    const averageTags = restaurantsReady
      ? Math.round(
          restaurants.reduce((count, restaurant) => count + restaurant.cuisineTags.length, 0) / restaurantsReady,
        )
      : 0

    const mostRecent = restaurants[0]
    return {
      restaurantsReady,
      averageTags,
      recentName: mostRecent?.restaurantName ?? 'Senderrplace pick',
    }
  }, [restaurants])

  const handleSelect = (restaurant: FoodPickupRestaurantDoc) => {
    navigate('/jobs/new', {
      state: {
        initialDeliveryIntent: 'food',
        initialPickup: {
          lat: restaurant.location.lat,
          lng: restaurant.location.lng,
          label: restaurant.location.address,
        },
        initialRestaurantId: restaurant.id,
        initialPickupLabel: restaurant.location.address,
        initialRestaurantName: restaurant.restaurantName,
      },
    })
  }

  const canSaveRestaurant =
    !!uid &&
    !!restaurantName.trim() &&
    !!pickupAddress.trim() &&
    pickupLat !== null &&
    pickupLng !== null &&
    !savingRestaurant

  const resetForm = () => {
    setRestaurantName('')
    setPickupAddress('')
    setPickupLat(null)
    setPickupLng(null)
    setCuisineTags('')
    setPickupHours('')
    setNotes('')
    setPhotoUrl('')
  }

  const handleSaveRestaurant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSaveRestaurant || !uid) return

    setSavingRestaurant(true)
    setFormMessage(null)
    try {
      await createFoodPickupRestaurantFromMarketplace(
        uid,
        user?.displayName || user?.email || 'Community member',
        {
          restaurantName,
          address: pickupAddress,
          lat: pickupLat!,
          lng: pickupLng!,
          cuisineTags: cuisineTags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
          pickupHours,
          notes,
          photoUrl,
        },
      )
      await refresh()
      setFormMessage('Restaurant added. It is now visible to customers.')
      resetForm()
      setAddingRestaurant(false)
    } catch (error) {
      console.error('Failed to save restaurant from marketplace:', error)
      setFormMessage('Could not save restaurant right now. Please try again.')
    } finally {
      setSavingRestaurant(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-purple-800 to-slate-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
        <section className="space-y-4">
          <p className="text-xs uppercase tracking-[0.4em] text-purple-200">
            Senderrplace Food Marketplace
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Order pickup from local restaurants vetted by Senderr couriers
          </h1>
          <p className="text-lg text-purple-100 max-w-3xl">
            Every Senderr courier can save a restaurant once, attach a photo, and the whole network will see the pickup spot the next time a customer places an order.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/20 bg-white/5 p-4">
              <p className="text-sm text-purple-200">Featured today</p>
              <p className="text-2xl font-semibold text-white">{heroStats.recentName}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-4">
              <p className="text-sm text-purple-200">Restaurants ready</p>
              <p className="text-2xl font-semibold text-white">{heroStats.restaurantsReady}</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/5 p-4">
              <p className="text-sm text-purple-200">Average tags</p>
              <p className="text-2xl font-semibold text-white">{heroStats.averageTags}</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="rounded-3xl border border-white/20 bg-white/10 p-5">
            <p className="text-xs uppercase tracking-[0.35em] text-purple-200">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold">Customers can grow the food map</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-purple-100">
              <li>Add a restaurant pickup location with exact address details.</li>
              <li>Optionally add tags, notes, hours, and a photo URL to help other customers.</li>
              <li>Save it once and everyone can order pickup from that location.</li>
            </ol>
            <p className="mt-3 text-xs text-purple-200">
              Couriers can also add locations, but this page is customer-first by default.
            </p>
            <button
              type="button"
              onClick={() => {
                setFormMessage(null)
                setAddingRestaurant((current) => !current)
              }}
              className="mt-4 rounded-2xl bg-gradient-to-r from-blue-400 to-cyan-300 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:opacity-90"
            >
              {addingRestaurant ? 'Close form' : 'Add a restaurant'}
            </button>
          </div>

          {addingRestaurant && (
            <form
              onSubmit={handleSaveRestaurant}
              className="rounded-3xl border border-white/20 bg-white/10 p-5 space-y-4"
            >
              <h3 className="text-xl font-semibold">Share a pickup spot</h3>
              <div>
                <label className="block text-sm font-medium text-purple-100 mb-1">Restaurant name</label>
                <input
                  type="text"
                  value={restaurantName}
                  onChange={(event) => setRestaurantName(event.target.value)}
                  placeholder="Example: Northside Deli"
                  className="w-full rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60"
                />
              </div>
              <AddressAutocomplete
                label="Pickup address"
                placeholder="Start typing the restaurant address"
                onSelect={(result) => {
                  setPickupAddress(result.address)
                  setPickupLat(result.lat)
                  setPickupLng(result.lng)
                }}
                value={pickupAddress}
                required
                theme="dark"
              />
              <div>
                <label className="block text-sm font-medium text-purple-100 mb-1">Cuisine tags (comma separated)</label>
                <input
                  type="text"
                  value={cuisineTags}
                  onChange={(event) => setCuisineTags(event.target.value)}
                  placeholder="burgers, halal, vegan"
                  className="w-full rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-100 mb-1">Pickup hours</label>
                <input
                  type="text"
                  value={pickupHours}
                  onChange={(event) => setPickupHours(event.target.value)}
                  placeholder="Mon-Fri 11am-9pm"
                  className="w-full rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-100 mb-1">Photo URL (optional)</label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(event) => setPhotoUrl(event.target.value)}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-100 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={3}
                  placeholder="Anything customers should know for pickup"
                  className="w-full rounded-xl border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60"
                />
              </div>
              <button
                type="submit"
                disabled={!canSaveRestaurant}
                className="rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-300 px-4 py-2 text-sm font-semibold text-slate-900 disabled:opacity-50"
              >
                {savingRestaurant ? 'Saving...' : 'Save restaurant'}
              </button>
              {formMessage && (
                <p className="text-sm text-purple-100">{formMessage}</p>
              )}
            </form>
          )}

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.5em] text-purple-200">Ready for pickup</p>
              <h2 className="text-2xl font-semibold">Saved restaurant locations</h2>
            </div>
            <span className="rounded-full border border-white/30 px-4 py-1 text-sm text-white/70">
              Updated {restaurants.length ? `${restaurants[0].updatedAt.toDate().toLocaleTimeString()}` : 'just now'}
            </span>
          </div>

          {loading ? (
            <div className="text-center text-white/70">Loading restaurants...</div>
          ) : restaurants.length === 0 ? (
            <div className="text-center text-white/60">No restaurants shared yet.</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {restaurants.map((restaurant) => (
                <FoodPickupCard
                  key={restaurant.id}
                  restaurant={restaurant}
                  onSelect={handleSelect}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

interface FoodPickupCardProps {
  restaurant: FoodPickupRestaurantDoc
  onSelect: (restaurant: FoodPickupRestaurantDoc) => void
}

function FoodPickupCard({ restaurant, onSelect }: FoodPickupCardProps) {
  return (
    <Card variant="elevated" className="bg-white/10 border border-white/20 shadow-none">
      <CardHeader>
        <CardTitle>{restaurant.restaurantName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-700 to-purple-800 p-4">
          {restaurant.photoUrl ? (
            <img
              src={restaurant.photoUrl}
              alt={restaurant.restaurantName}
              className="h-40 w-full rounded-2xl object-cover"
            />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-2xl border border-white/20 text-sm text-white/70">
              No photo yet
            </div>
          )}
        </div>
        <div className="space-y-1 text-sm text-white/70">
          <div>{restaurant.location.address}</div>
          <div className="text-xs uppercase tracking-[0.4em] text-white/50">
            {formatTags(restaurant.cuisineTags)}
          </div>
          {restaurant.notes && <p className="text-white/80">{restaurant.notes}</p>}
          {restaurant.pickupHours && (
            <p className="text-xs text-white/60">Hours: {restaurant.pickupHours}</p>
          )}
        </div>
        <button
          onClick={() => onSelect(restaurant)}
          className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-400 px-4 py-3 text-sm font-semibold text-slate-900 transition hover:opacity-90"
        >
          Order pickup
        </button>
      </CardContent>
    </Card>
  )
}

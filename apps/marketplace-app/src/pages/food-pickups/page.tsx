import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useFoodPickupRestaurants } from '@/lib/foodPickup'
import { FoodPickupRestaurantDoc } from '@gosenderr/shared'

function formatTags(tags: string[]) {
  if (!tags.length) return 'Everyday favorites'
  return tags.map((tag) => tag.toUpperCase()).join(' · ')
}

export default function FoodPickupsPage() {
  const navigate = useNavigate()
  const { restaurants, loading } = useFoodPickupRestaurants()

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
        initialPickup: {
          lat: restaurant.location.lat,
          lng: restaurant.location.lng,
          label: restaurant.location.address,
        },
        initialPickupLabel: restaurant.location.address,
        initialRestaurantName: restaurant.restaurantName,
      },
    })
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

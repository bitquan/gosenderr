import { Link } from 'react-router-dom'
import type { MarketplaceItem } from '../../types/marketplace'
import { DeliveryOption } from '../../types/marketplace'
import { SellerBadgeList } from './SellerBadge'
import { getPickupDisplayAddress } from '@/lib/pickupPrivacy'
import { FLOOR_RATE_CARD } from '@/lib/v2/floorRateCard'
import { calcFee, calcMiles } from '@/lib/v2/pricing'

interface ItemCardProps {
  item: MarketplaceItem
  sellerBadges?: string[] // Array of badge types from seller profile
  sellerRating?: {
    average: number
    count: number
  }
  showExactPickupLocation?: boolean
  customerAddressSet?: boolean
  customerLocation?: {
    lat: number
    lng: number
  } | null
}

/**
 * ItemCard - Display a marketplace item in card format
 * Phase 2: Shows seller info (unified user model)
 */
export function ItemCard({
  item,
  sellerBadges = [],
  sellerRating,
  showExactPickupLocation = false,
  customerAddressSet = false,
  customerLocation = null,
}: ItemCardProps) {
  const normalizeUrl = (url?: string) => {
    if (!url) return ''
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
      return url.replace('http://', 'https://')
    }
    return url
  }

  const primaryImage = normalizeUrl(item.photos?.[0]) || '/placeholder-item.png'
  const isOutOfStock = item.quantity === 0
  const supportsCourier = item.deliveryOptions?.includes(DeliveryOption.COURIER)

  const pickupLocation = item.pickupLocation
  const pickupDisplayAddress = pickupLocation
    ? getPickupDisplayAddress(pickupLocation, showExactPickupLocation)
    : null

  const pickupLat = (pickupLocation?.location as any)?.latitude ?? (pickupLocation?.location as any)?.lat
  const pickupLng = (pickupLocation?.location as any)?.longitude ?? (pickupLocation?.location as any)?.lng
  const hasPickupCoords = Number.isFinite(pickupLat) && Number.isFinite(pickupLng)

  let senderrEstimate: number | null = null
  if (supportsCourier && customerLocation && hasPickupCoords) {
    const jobMiles = calcMiles(
      { lat: Number(pickupLat), lng: Number(pickupLng) },
      { lat: customerLocation.lat, lng: customerLocation.lng },
    )
    senderrEstimate = calcFee(FLOOR_RATE_CARD, jobMiles, 0, 'car')
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new':
        return 'bg-green-100 text-green-800'
      case 'like_new':
        return 'bg-blue-100 text-blue-800'
      case 'good':
        return 'bg-yellow-100 text-yellow-800'
      case 'fair':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getConditionLabel = (condition: string) => {
    return condition.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <Link
      to={`/marketplace/${item.id}`}
      className="group block bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <img
          src={primaryImage}
          alt={item.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Condition badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConditionColor(item.condition)}`}>
            {getConditionLabel(item.condition)}
          </span>
        </div>

        {/* Out of stock overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <span className="px-4 py-2 bg-red-600 text-white font-semibold rounded-lg">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors mb-2">
          {item.title}
        </h3>

        {/* Category */}
        <p className="text-sm text-gray-500 mb-3 capitalize">{item.category}</p>

        {pickupDisplayAddress && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-1">
            📍 {pickupDisplayAddress}
          </p>
        )}

        {supportsCourier && (
          <p className="text-xs mb-3 text-purple-700">
            {customerAddressSet
              ? senderrEstimate !== null
                ? `🚚 Senderr est. ${formatPrice(senderrEstimate)}`
                : '🚚 Senderr available at checkout'
              : '🚚 Set your address to see Senderr rates'}
          </p>
        )}

        {/* Price and quantity */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-2xl font-bold text-gray-900">
            {formatPrice(item.price)}
          </div>
          <div className="text-xs text-gray-500">
            {item.quantity} available
          </div>
        </div>

        {/* Seller info */}
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {item.sellerPhotoURL ? (
                <img
                  src={normalizeUrl(item.sellerPhotoURL)}
                  alt={item.sellerName}
                  className="w-6 h-6 rounded-full"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                  {item.sellerName?.charAt(0).toUpperCase() || 'S'}
                </div>
              )}
              <span className="text-sm text-gray-600">{item.sellerName || 'Seller'}</span>
            </div>
            <div className="text-xs text-gray-500">
              {sellerRating && sellerRating.count > 0 ? (
                <span>⭐ {sellerRating.average.toFixed(1)} ({sellerRating.count})</span>
              ) : (
                <span>New</span>
              )}
            </div>
          </div>
          {sellerBadges.length > 0 && (
            <div className="mt-2">
              <SellerBadgeList badges={sellerBadges as any} size="sm" showLabel={false} maxDisplay={3} />
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

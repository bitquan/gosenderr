import type { MarketplaceItem } from '../../types/marketplace'
import { ItemCard } from './ItemCard'

interface ItemGridProps {
  items: MarketplaceItem[]
  loading?: boolean
  sellerBadgesMap?: Record<string, string[]>
  sellerRatingsMap?: Record<string, { average: number; count: number }>
}

/**
 * ItemGrid - Display marketplace items in a responsive grid
 */
export function ItemGrid({ items, loading, sellerBadgesMap = {}, sellerRatingsMap = {} }: ItemGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Image skeleton */}
            <div className="aspect-square bg-gray-200 animate-pulse" />
            {/* Content skeleton */}
            <div className="p-4 space-y-3">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
              <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No items found</h3>
        <p className="text-gray-600">Try adjusting your filters or search term</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => (
        <ItemCard 
          key={item.id} 
          item={item} 
          sellerBadges={sellerBadgesMap[item.sellerId] || []}
          sellerRating={sellerRatingsMap[item.sellerId]}
        />
      ))}
    </div>
  )
}


import { Link } from 'react-router-dom'
import { MarketplaceItem } from '@gosenderr/shared'

interface ItemCardProps {
  item: MarketplaceItem
}

/**
 * ItemCard - Display a marketplace item in card format
 */
export function ItemCard({ item }: ItemCardProps) {
  const primaryImage = item.images?.[0] || '/placeholder-item.png'
  const isOutOfStock = item.inventory.quantity === 0

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
        <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-purple-600 transition-colors mb-2">
          {item.title}
        </h3>

        {/* Category */}
        <p className="text-sm text-gray-500 mb-3">{item.category}</p>

        {/* Price and shipping */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-bold text-gray-900">
              {formatPrice(item.price)}
            </div>
            {item.shipping.methods.includes('free_shipping') && (
              <span className="text-xs text-green-600 font-medium">
                Free Shipping
              </span>
            )}
          </div>

          {/* Quick info */}
          <div className="text-right">
            <div className="text-xs text-gray-500">
              {item.inventory.quantity} in stock
            </div>
          </div>
        </div>

        {/* Vendor info */}
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
              {item.vendor.name.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-gray-600">{item.vendor.name}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

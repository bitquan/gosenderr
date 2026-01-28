import { CartItem as CartItemType } from '../../contexts/CartContext'
import { Link } from 'react-router-dom'

interface CartItemProps {
  cartItem: CartItemType
  onUpdateQuantity: (quantity: number) => void
  onRemove: () => void
}

/**
 * CartItem - Display a single item in the shopping cart
 */
export function CartItem({ cartItem, onUpdateQuantity, onRemove }: CartItemProps) {
  const { item, quantity } = cartItem
  const primaryImage = item.images?.[0] || '/placeholder-item.png'

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= item.stock) {
      onUpdateQuantity(newQuantity)
    }
  }

  const subtotal = item.price * quantity

  return (
    <div className="flex gap-4 py-4 border-b border-gray-200">
      {/* Image */}
      <Link
        to={`/marketplace/${item.id}`}
        className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden"
      >
        <img
          src={primaryImage}
          alt={item.title}
          className="w-full h-full object-cover"
        />
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <Link
          to={`/marketplace/${item.id}`}
          className="font-medium text-gray-900 hover:text-purple-600 line-clamp-1"
        >
          {item.title}
        </Link>
        
        <p className="text-sm text-gray-500 mt-1">
          {formatPrice(item.price)} each
        </p>

        {/* Quantity Controls */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => handleQuantityChange(quantity - 1)}
            disabled={quantity <= 1}
            className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          <span className="text-sm font-medium w-8 text-center">{quantity}</span>
          
          <button
            onClick={() => handleQuantityChange(quantity + 1)}
            disabled={quantity >= item.stock}
            className="w-7 h-7 flex items-center justify-center border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <button
            onClick={onRemove}
            className="ml-auto text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Remove
          </button>
        </div>

        {/* Stock warning */}
        {quantity >= item.stock && (
          <p className="text-xs text-orange-600 mt-1">
            Max quantity reached
          </p>
        )}
      </div>

      {/* Subtotal */}
      <div className="text-right flex-shrink-0">
        <p className="font-semibold text-gray-900">
          {formatPrice(subtotal)}
        </p>
      </div>
    </div>
  )
}

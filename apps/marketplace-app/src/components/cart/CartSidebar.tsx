import { useCart } from '../../contexts/CartContext'
import { CartItem } from './CartItem'
import { Link } from 'react-router-dom'

/**
 * CartSidebar - Sliding cart panel
 */
export function CartSidebar() {
  const { items, isOpen, closeCart, updateQuantity, removeItem, subtotal, itemCount } = useCart()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={closeCart}
      />

      {/* Sidebar */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Shopping Cart ({itemCount})
          </h2>
          <button
            onClick={closeCart}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Your cart is empty
              </h3>
              <p className="text-gray-600 mb-6">
                Add items from Senderrplace to get started
              </p>
              <Link
                to="/marketplace"
                onClick={closeCart}
                className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
              >
                Browse Senderrplace
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((cartItem) => (
                <CartItem
                  key={cartItem.item.id}
                  cartItem={cartItem}
                  onUpdateQuantity={(quantity) => updateQuantity(cartItem.item.id!, quantity)}
                  onRemove={() => removeItem(cartItem.item.id!)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer - Checkout */}
        {items.length > 0 && (
          <div className="border-t border-gray-200 p-6 bg-gray-50">
            {/* Subtotal */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-600">Subtotal</span>
              <span className="text-2xl font-bold text-gray-900">
                {formatPrice(subtotal)}
              </span>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Shipping and taxes calculated at checkout
            </p>

            {/* Checkout Button */}
            <Link
              to="/marketplace/checkout"
              onClick={closeCart}
              className="block w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all text-center font-semibold"
            >
              Proceed to Checkout
            </Link>

            {/* Continue Shopping */}
            <button
              onClick={closeCart}
              className="block w-full mt-3 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-center font-medium"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  )
}

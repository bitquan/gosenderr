import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase/client'
import { MarketplaceItem } from '@gosenderr/shared'
import { useCart } from '../../../contexts/CartContext'

/**
 * ItemDetailPage - Detailed view of a marketplace item
 */
export default function ItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const navigate = useNavigate()
  const { addItem, getItemQuantity } = useCart()
  
  const [item, setItem] = useState<MarketplaceItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState(0)
  const [quantity, setQuantity] = useState(1)

  useEffect(() => {
    if (itemId) {
      fetchItem(itemId)
    }
  }, [itemId])

  const fetchItem = async (id: string) => {
    setLoading(true)
    try {
      const docRef = doc(db, 'marketplaceItems', id)
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        setItem({ id: docSnap.id, ...docSnap.data() } as MarketplaceItem)
      } else {
        console.error('Item not found')
        navigate('/marketplace')
      }
    } catch (error) {
      console.error('Error fetching item:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price)
  }

  const getConditionLabel = (condition: string) => {
    return condition.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const handleAddToCart = () => {
    if (item) {
      addItem(item, quantity)
    }
  }

  const inCart = item ? getItemQuantity(item.id!) : 0
  const canAddMore = item ? (inCart + quantity) <= item.stock : false
  const isOutOfStock = item ? item.stock === 0 : true

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-lg" />
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-6 bg-gray-200 rounded w-1/2" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Item not found</h2>
        <Link to="/marketplace" className="text-purple-600 hover:text-purple-700">
          Back to marketplace
        </Link>
      </div>
    )
  }

  const images = item.images && item.images.length > 0 ? item.images : ['/placeholder-item.png']

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
        <Link to="/marketplace" className="hover:text-purple-600">Marketplace</Link>
        <span>/</span>
        <Link to={`/marketplace?category=${item.category}`} className="hover:text-purple-600">
          {item.category}
        </Link>
        <span>/</span>
        <span className="text-gray-900">{item.title}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div>
          {/* Main Image */}
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
            <img
              src={images[selectedImage]}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImage === index
                      ? 'border-purple-600'
                      : 'border-transparent hover:border-gray-300'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${item.title} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Item Details */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{item.title}</h1>

          {/* Price */}
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-4xl font-bold text-gray-900">
              {formatPrice(item.price)}
            </span>
            {item.featured && (
              <span className="text-sm font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full">
                Free Shipping
              </span>
            )}
          </div>

          {/* Condition */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b">
            <div>
              <span className="text-sm text-gray-600">Condition:</span>
              <span className="ml-2 font-medium text-gray-900">
                {getConditionLabel(item.condition)}
              </span>
            </div>
            <div>
              <span className="text-sm text-gray-600">Category:</span>
              <span className="ml-2 font-medium text-gray-900">{item.category}</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="font-semibold text-gray-900 mb-2">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{item.description}</p>
          </div>

          {/* Stock Status */}
          <div className="mb-6">
            {isOutOfStock ? (
              <div className="text-red-600 font-medium">Out of Stock</div>
            ) : item.stock <= 5 ? (
              <div className="text-orange-600 font-medium">
                Only {item.stock} left in stock
              </div>
            ) : (
              <div className="text-green-600 font-medium">In Stock</div>
            )}
          </div>

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                </button>
                <input
                  type="number"
                  min="1"
                  max={item.stock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(item.stock, parseInt(e.target.value) || 1)))}
                  className="w-20 text-center border border-gray-300 rounded-lg py-2 font-medium"
                />
                <button
                  onClick={() => setQuantity(Math.min(item.stock, quantity + 1))}
                  className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              {inCart > 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  {inCart} already in cart
                </p>
              )}
            </div>
          )}

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock || !canAddMore}
            className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>

          {/* Vendor Info */}
          <div className="border-t pt-6">
            <h2 className="font-semibold text-gray-900 mb-3">Sold by</h2>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-lg font-semibold">
                {item.vendorName?.charAt(0).toUpperCase() || 'V'}
              </div>
              <div>
                <div className="font-medium text-gray-900">{item.vendorName || 'Vendor'}</div>
                {item.rating && (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <span>⭐</span>
                    <span>{item.rating.toFixed(1)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
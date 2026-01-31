import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { marketplaceService } from '../../../services/marketplace.service'
import type { MarketplaceItem } from '../../../types/marketplace'
import { useCart } from '../../../contexts/CartContext'
import { useAuth } from '../../../contexts/AuthContext'

/**
 * ItemDetailPage - Detailed view of a marketplace item (Phase 2)
 * Shows seller profile (unified user model)
 */
export default function ItemDetailPage() {
  const { itemId } = useParams<{ itemId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
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
      const fetchedItem = await marketplaceService.getItem(id)
      
      if (fetchedItem) {
        setItem(fetchedItem)
      } else {
        console.error('Item not found')
        navigate('/marketplace')
      }
    } catch (error) {
      console.error('Error fetching item:', error)
      navigate('/marketplace')
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

  const handleContactSeller = () => {
    if (!user) {
      navigate('/login')
      return
    }
    // Navigate to messages with this seller
    navigate(`/messages?user=${item?.sellerId}&itemId=${item?.id}`)
  }

  const inCart = item ? getItemQuantity(item.id!) : 0
  const availableStock = item ? (item.quantity ?? 0) : 0
  const canAddMore = item ? (inCart + quantity) <= availableStock : false
  const isOutOfStock = availableStock === 0

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
        <Link to="/marketplace" className="text-blue-600 hover:text-blue-700">
          Back to marketplace
        </Link>
      </div>
    )
  }

  const images = item.photos && item.photos.length > 0 ? item.photos : ['/placeholder-item.png']

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
        <Link to="/marketplace" className="hover:text-blue-600">Marketplace</Link>
        <span>/</span>
        <span className="text-gray-900 capitalize">{item.category}</span>
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
              <span className="ml-2 font-medium text-gray-900 capitalize">{item.category}</span>
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
            ) : availableStock <= 5 ? (
              <div className="text-orange-600 font-medium">
                Only {availableStock} left in stock
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
                  max={availableStock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Math.min(availableStock, parseInt(e.target.value) || 1)))}
                  className="w-20 text-center border border-gray-300 rounded-lg py-2 font-medium"
                />
                <button
                  onClick={() => setQuantity(Math.min(availableStock, quantity + 1))}
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

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={() => {
                if (!user) {
                  navigate('/login');
                  return;
                }
                navigate(`/checkout?itemId=${item.id}`);
              }}
              disabled={isOutOfStock}
              className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isOutOfStock ? 'Out of Stock' : '💳 Buy Now'}
            </button>

            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock || !canAddMore}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isOutOfStock ? 'Out of Stock' : '🛒 Add to Cart'}
              </button>
              
              <button
                onClick={handleContactSeller}
                className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-all font-semibold"
              >
                💬
              </button>
            </div>
          </div>

          {/* Seller Profile Card */}
          <div className="border rounded-lg p-6 bg-gray-50">
            <h2 className="font-semibold text-gray-900 mb-4">Sold by</h2>
            <div className="flex items-start gap-4">
              {/* Seller Avatar */}
              {item.sellerPhotoURL ? (
                <img
                  src={item.sellerPhotoURL}
                  alt={item.sellerName}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-semibold">
                  {item.sellerName?.charAt(0).toUpperCase() || 'S'}
                </div>
              )}
              
              {/* Seller Info */}
              <div className="flex-1">
                <div className="font-medium text-gray-900 text-lg mb-1">
                  {item.sellerName || 'Seller'}
                </div>
                
                <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-1">
                    <span>⭐</span>
                    <span>4.8</span>
                  </div>
                  <div>
                    {item.soldCount || 0} sales
                  </div>
                </div>

                <button
                  onClick={handleContactSeller}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Contact Seller
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
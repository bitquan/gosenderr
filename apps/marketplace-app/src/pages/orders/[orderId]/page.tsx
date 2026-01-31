import { useEffect, useState } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase'
import { useAuth } from '../../../hooks/useAuth'
import { RateOrderModal } from '../../../components/v2/RateOrderModal'

interface OrderItem {
  itemId: string
  title: string
  quantity: number
  price: number
  sellerId: string
}

interface Order {
  id: string
  customerId: string
  customerEmail: string
  items: OrderItem[]
  shippingInfo: {
    fullName: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  subtotal: number
  shipping: number
  tax: number
  total: number
  paymentIntentId: string
  paymentStatus: string
  status: string
  createdAt: any
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const location = useLocation() as { state?: { openRating?: boolean } }
  const { user } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sellerName, setSellerName] = useState<string>('Seller')
  const [ratingOpen, setRatingOpen] = useState(false)
  const [ratingExists, setRatingExists] = useState(false)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId || !user) return

      try {
        const orderDoc = await getDoc(doc(db, 'orders', orderId))
        
        if (!orderDoc.exists()) {
          setError('Order not found')
          return
        }

        const orderData = orderDoc.data() as Order
        
        // Verify user owns this order
        if (orderData.customerId !== user.uid) {
          setError('You do not have permission to view this order')
          return
        }

        setOrder({
          ...orderData,
          id: orderDoc.id,
        })

        const firstItem = orderData.items?.[0]
        if (firstItem?.sellerId) {
          try {
            const sellerDoc = await getDoc(doc(db, 'users', firstItem.sellerId))
            if (sellerDoc.exists()) {
              const sellerData = sellerDoc.data() as { displayName?: string }
              setSellerName(sellerData.displayName || 'Seller')
            }
          } catch (err) {
            console.warn('Unable to load seller profile:', err)
          }
        }

        try {
          const ratingId = `${orderDoc.id}_${user.uid}`
          const ratingDoc = await getDoc(doc(db, 'ratings', ratingId))
          setRatingExists(ratingDoc.exists())
        } catch (err) {
          console.warn('Unable to load rating status:', err)
        }
      } catch (err) {
        console.error('Error fetching order:', err)
        setError('Failed to load order details')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, user])

  useEffect(() => {
    if (location.state?.openRating && order && !ratingExists) {
      setRatingOpen(true)
    }
  }, [location.state, order, ratingExists])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Not Found</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              to="/marketplace"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Back to Marketplace
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'shipped':
        return 'bg-purple-100 text-purple-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-6 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
          <p className="text-gray-600 mb-4">
            Thank you for your purchase. We've sent a confirmation email to{' '}
            <span className="font-semibold">{order.customerEmail}</span>
          </p>
          <div className="inline-flex items-center gap-2 text-sm text-gray-500">
            <span>Order ID:</span>
            <span className="font-mono bg-gray-100 px-3 py-1 rounded">{order.id}</span>
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Order Status</h2>
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            <p>Placed on {formatDate(order.createdAt)}</p>
            <p className="mt-1">Payment Status: <span className="font-semibold capitalize">{order.paymentStatus}</span></p>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between items-start py-4 border-b last:border-b-0">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">Quantity: {item.quantity}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                  <p className="text-sm text-gray-500">${item.price.toFixed(2)} each</p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Totals */}
          <div className="mt-6 pt-6 border-t space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-semibold">${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Shipping</span>
              <span className="font-semibold text-green-600">
                {order.shipping === 0 ? 'FREE' : `$${order.shipping.toFixed(2)}`}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax</span>
              <span className="font-semibold">${order.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total</span>
              <span>${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Shipping Information */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Shipping Information</h2>
          <div className="text-gray-700">
            <p className="font-semibold">{order.shippingInfo.fullName}</p>
            <p className="mt-2">{order.shippingInfo.address}</p>
            <p>
              {order.shippingInfo.city}, {order.shippingInfo.state} {order.shippingInfo.zipCode}
            </p>
            <p>{order.shippingInfo.country}</p>
            <p className="mt-3 text-sm">
              <span className="text-gray-600">Email:</span> {order.shippingInfo.email}
            </p>
            <p className="text-sm">
              <span className="text-gray-600">Phone:</span> {order.shippingInfo.phone}
            </p>
          </div>
        </div>

        {order.status === 'delivered' && order.items?.[0] && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold mb-2">Rate Your Order</h2>
            <p className="text-sm text-gray-600 mb-4">
              Share your feedback to help other shoppers.
            </p>
            <button
              onClick={() => setRatingOpen(true)}
              disabled={ratingExists}
              className="px-5 py-3 rounded-lg font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            >
              {ratingExists ? 'Rating Submitted' : 'Rate Order'}
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <Link
            to="/orders"
            className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-center font-semibold"
          >
            View All Orders
          </Link>
          <Link
            to="/marketplace"
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-center font-semibold"
          >
            Continue Shopping
          </Link>
        </div>

        {order.items?.[0] && user && (
          <RateOrderModal
            isOpen={ratingOpen}
            onClose={() => setRatingOpen(false)}
            onSubmitted={() => setRatingExists(true)}
            orderId={order.id}
            itemId={order.items[0].itemId}
            itemName={order.items[0].title}
            sellerId={order.items[0].sellerId}
            sellerName={sellerName}
            customerId={user.uid}
          />
        )}
      </div>
    </div>
  )
}

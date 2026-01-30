import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { formatCurrency } from '../lib/utils'

interface OrderItem {
  itemId: string
  title: string
  price: number
  quantity: number
  imageUrl?: string
}

interface Order {
  id: string
  customerId: string
  customerEmail: string
  customerName?: string
  sellerId: string
  sellerEmail: string
  sellerName?: string
  items: OrderItem[]
  subtotal: number
  tax: number
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded'
  shippingAddress?: {
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  paymentInfo?: {
    method: string
    last4?: string
  }
  createdAt: any
  updatedAt?: any
  statusHistory?: Array<{
    status: string
    timestamp: any
    note?: string
  }>
  adminNotes?: string
  refundAmount?: number
  refundReason?: string
  refundedAt?: any
}

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [refundReason, setRefundReason] = useState('')
  const [showRefundModal, setShowRefundModal] = useState(false)
  const [customer, setCustomer] = useState<any>(null)
  const [vendor, setVendor] = useState<any>(null)

  useEffect(() => {
    if (orderId) {
      loadOrder()
    }
  }, [orderId])

  const loadOrder = async () => {
    if (!orderId) return
    
    try {
      const orderDoc = await getDoc(doc(db, 'orders', orderId))
      
      if (orderDoc.exists()) {
        const data = { id: orderDoc.id, ...orderDoc.data() } as Order
        setOrder(data)
        setAdminNotes(data.adminNotes || '')
        
        // Load customer details
        try {
          const customerDoc = await getDoc(doc(db, 'users', data.customerId))
          if (customerDoc.exists()) {
            setCustomer(customerDoc.data())
          }
        } catch (e) { }
        
        // Load vendor details
        try {
          const vendorDoc = await getDoc(doc(db, 'users', data.sellerId))
          if (vendorDoc.exists()) {
            setVendor(vendorDoc.data())
          }
        } catch (e) { }
      } else {
        console.error('Order not found')
      }
    } catch (error) {
      console.error('Error loading order:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (newStatus: string) => {
    if (!order || !orderId) return
    
    setUpdating(true)
    try {
      const statusUpdate = {
        status: newStatus,
        timestamp: Timestamp.now(),
        note: `Status changed by admin`
      }
      
      const updates: any = {
        status: newStatus,
        updatedAt: Timestamp.now(),
        statusHistory: [...(order.statusHistory || []), statusUpdate]
      }

      await updateDoc(doc(db, 'orders', orderId), updates)
      
      // Log admin action
      await addDoc(collection(db, 'adminLogs'), {
        action: 'order_status_change',
        orderId,
        oldStatus: order.status,
        newStatus,
        timestamp: Timestamp.now(),
        adminEmail: 'admin@example.com' // TODO: get from auth
      })

      await loadOrder()
    } catch (error) {
      console.error('Error updating order:', error)
      alert('Failed to update order status')
    } finally {
      setUpdating(false)
    }
  }

  const saveAdminNotes = async () => {
    if (!orderId) return
    
    setUpdating(true)
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        adminNotes,
        updatedAt: Timestamp.now()
      })

      await addDoc(collection(db, 'adminLogs'), {
        action: 'order_notes_updated',
        orderId,
        timestamp: Timestamp.now(),
        adminEmail: 'admin@example.com'
      })

      alert('Notes saved successfully')
      await loadOrder()
    } catch (error) {
      console.error('Error saving notes:', error)
      alert('Failed to save notes')
    } finally {
      setUpdating(false)
    }
  }

  const processRefund = async () => {
    if (!order || !orderId) return
    
    const amount = parseFloat(refundAmount)
    if (isNaN(amount) || amount <= 0 || amount > order.total) {
      alert('Invalid refund amount')
      return
    }

    if (!refundReason.trim()) {
      alert('Please provide a refund reason')
      return
    }

    setUpdating(true)
    try {
      const updates: any = {
        status: 'refunded',
        refundAmount: amount,
        refundReason,
        refundedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      }

      await updateDoc(doc(db, 'orders', orderId), updates)

      // Log admin action
      await addDoc(collection(db, 'adminLogs'), {
        action: 'order_refunded',
        orderId,
        amount,
        reason: refundReason,
        timestamp: Timestamp.now(),
        adminEmail: 'admin@example.com'
      })

      setShowRefundModal(false)
      alert('Refund processed successfully')
      await loadOrder()
    } catch (error) {
      console.error('Error processing refund:', error)
      alert('Failed to process refund')
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Order not found</p>
          <Link to="/marketplace-orders" className="text-purple-600 hover:underline">
            Back to Orders
          </Link>
        </div>
      </div>
    )
  }

  const statusColors: Record<string, { badge: string; icon: string }> = {
    pending: { badge: 'bg-yellow-100 text-yellow-700', icon: '⏳' },
    processing: { badge: 'bg-blue-100 text-blue-700', icon: '⚙️' },
    shipped: { badge: 'bg-purple-100 text-purple-700', icon: '📦' },
    delivered: { badge: 'bg-green-100 text-green-700', icon: '✅' },
    cancelled: { badge: 'bg-red-100 text-red-700', icon: '❌' },
    refunded: { badge: 'bg-gray-100 text-gray-700', icon: '💰' }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-7xl mx-auto">
          <Link to="/marketplace-orders" className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition">
            <span>←</span>
            <span>Back to Orders</span>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Order #{order.id.slice(0, 8).toUpperCase()}</h1>
              <p className="text-purple-100 mt-1">Created {formatDate(order.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full font-semibold flex items-center gap-2 ${statusColors[order.status]?.badge}`}>
                <span>{statusColors[order.status]?.icon}</span>
                {order.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Order Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Total Amount</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{formatCurrency(order.total)}</p>
              {order.refundAmount && (
                <p className="text-sm text-red-600 mt-1">Refunded: {formatCurrency(order.refundAmount)}</p>
              )}
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Items Count</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {order.items.reduce((sum, item) => sum + item.quantity, 0)}
              </p>
              <p className="text-sm text-gray-600 mt-1">{order.items.length} product(s)</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Tax</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{formatCurrency(order.tax)}</p>
              <p className="text-sm text-gray-600 mt-1">Subtotal: {formatCurrency(order.subtotal)}</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Last Updated</p>
              <p className="text-sm font-semibold text-gray-900 mt-2">{formatDate(order.updatedAt || order.createdAt)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Order Items */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>📦 Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.items.map((item, index) => (
                    <div key={index} className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-start gap-4 flex-1">
                        {item.imageUrl && (
                          <img 
                            src={item.imageUrl} 
                            alt={item.title} 
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-gray-900">{item.title}</p>
                          <p className="text-sm text-gray-500 mt-1">Item ID: {item.itemId.slice(0, 8)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(item.price * item.quantity)}</p>
                        <p className="text-sm text-gray-500">
                          {item.quantity} × {formatCurrency(item.price)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Price Breakdown */}
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(order.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax</span>
                      <span>{formatCurrency(order.tax)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t">
                      <span>Total</span>
                      <span>{formatCurrency(order.total)}</span>
                    </div>
                    {order.refundAmount && (
                      <div className="flex justify-between text-red-600 font-semibold pt-2">
                        <span>Refunded</span>
                        <span>-{formatCurrency(order.refundAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer & Vendor Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>👤 Customer Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 font-semibold">Name</p>
                      <p className="text-gray-900 font-semibold">{customer?.name || order.customerName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-semibold">Email</p>
                      <p className="text-gray-900">{order.customerEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-semibold">Customer ID</p>
                      <p className="text-xs text-gray-600 font-mono">{order.customerId}</p>
                    </div>
                    {customer?.role && (
                      <div>
                        <p className="text-sm text-gray-500 font-semibold">Role</p>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                          {customer.role}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>🏪 Vendor Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 font-semibold">Vendor Name</p>
                      <p className="text-gray-900 font-semibold">{vendor?.name || order.sellerName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-semibold">Email</p>
                      <p className="text-gray-900">{order.sellerEmail}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-semibold">Vendor ID</p>
                      <p className="text-xs text-gray-600 font-mono">{order.sellerId}</p>
                    </div>
                    {vendor?.vendorProfile?.rating && (
                      <div>
                        <p className="text-sm text-gray-500 font-semibold">Rating</p>
                        <p className="text-gray-900">{vendor.vendorProfile.rating.toFixed(1)} ⭐</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Shipping Address */}
            {order.shippingAddress && (
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>📍 Shipping Address</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-gray-900">
                    <p className="font-semibold">{order.shippingAddress.street}</p>
                    <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                    <p>{order.shippingAddress.country}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment Information */}
            {order.paymentInfo && (
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>💳 Payment Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 font-semibold">Payment Method</p>
                      <p className="text-gray-900 font-semibold capitalize">{order.paymentInfo.method}</p>
                    </div>
                    {order.paymentInfo.last4 && (
                      <div>
                        <p className="text-sm text-gray-500 font-semibold">Card</p>
                        <p className="text-gray-900 font-mono">•••• •••• •••• {order.paymentInfo.last4}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Status Management */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>⚙️ Status Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Change Status</label>
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(e.target.value)}
                      disabled={updating || order.status === 'refunded' || order.status === 'cancelled'}
                      className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="pending">⏳ Pending</option>
                      <option value="processing">⚙️ Processing</option>
                      <option value="shipped">📦 Shipped</option>
                      <option value="delivered">✅ Delivered</option>
                      <option value="cancelled">❌ Cancelled</option>
                    </select>
                  </div>

                  {order.status !== 'refunded' && order.status !== 'cancelled' && (
                    <button
                      onClick={() => setShowRefundModal(true)}
                      disabled={updating}
                      className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold disabled:opacity-50"
                    >
                      💰 Issue Refund
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Order Timeline */}
            {order.statusHistory && order.statusHistory.length > 0 && (
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>📜 Order Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {order.statusHistory.map((event, index) => (
                      <div key={index} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                          {statusColors[event.status]?.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 capitalize">{event.status}</p>
                          <p className="text-xs text-gray-500">{formatDate(event.timestamp)}</p>
                          {event.note && <p className="text-xs text-gray-600 mt-1">{event.note}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Refund Info */}
            {order.refundAmount && (
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle>💰 Refund Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500 font-semibold">Amount Refunded</p>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(order.refundAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-semibold">Reason</p>
                      <p className="text-gray-900">{order.refundReason}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 font-semibold">Refund Date</p>
                      <p className="text-gray-900">{formatDate(order.refundedAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Admin Notes */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>📝 Admin Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes about this order..."
                    className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-32 resize-none"
                  />
                  <button
                    onClick={saveAdminNotes}
                    disabled={updating}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold disabled:opacity-50"
                  >
                    Save Notes
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">💰 Issue Refund</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Refund Amount
                  <span className="text-gray-500 font-normal ml-1">(Max: {formatCurrency(order.total)})</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    max={order.total}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-3 pl-7 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Refund Reason</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  placeholder="Explain why this refund is being issued..."
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowRefundModal(false)
                    setRefundAmount('')
                    setRefundReason('')
                  }}
                  disabled={updating}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={processRefund}
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold disabled:opacity-50"
                >
                  {updating ? 'Processing...' : 'Issue Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

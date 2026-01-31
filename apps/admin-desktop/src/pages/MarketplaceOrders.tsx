import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, orderBy, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { formatCurrency } from '../lib/utils'
import { exportToCSV, formatOrdersForExport } from '../lib/csvExport'

interface Order {
  id: string
  customerId: string
  customerEmail: string
  customerName?: string
  sellerId: string
  sellerEmail: string
  sellerName?: string
  items: Array<{
    itemId: string
    title: string
    price: number
    quantity: number
  }>
  subtotal: number
  tax: number
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  shippingAddress?: any
  createdAt: any
  updatedAt?: any
}

export default function MarketplaceOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    loadOrders()
  }, [])

  const loadOrders = async () => {
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Order))
      
      setOrders(ordersData)
    } catch (error) {
      console.error('Error loading orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    if (!confirm(`Change order status to ${newStatus}?`)) return

    setUpdating(orderId)
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: Timestamp.now()
      })

      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus as any } : order
      ))

      console.log(`Order ${orderId} status changed to ${newStatus}`)
    } catch (error) {
      console.error('Error updating order:', error)
      alert('Failed to update order status')
    } finally {
      setUpdating(null)
    }
  }

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchQuery === '' || 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.sellerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.sellerName?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Calculate stats
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    processing: orders.filter(o => o.status === 'processing').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    totalRevenue: orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + o.total, 0)
  }

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    shipped: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">📦 Marketplace Orders</h1>
          <p className="text-purple-100">View and manage all marketplace orders</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card variant="elevated">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-1">📦</div>
              <p className="text-2xl font-bold text-purple-600">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Orders</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-1">⏳</div>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              <p className="text-sm text-gray-600">Pending</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-1">✅</div>
              <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
              <p className="text-sm text-gray-600">Delivered</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-4 text-center">
              <div className="text-3xl mb-1">💰</div>
              <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalRevenue)}</p>
              <p className="text-sm text-gray-600">Revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by order ID, customer, or seller..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Status ({stats.total})</option>
                <option value="pending">Pending ({stats.pending})</option>
                <option value="processing">Processing ({stats.processing})</option>
                <option value="shipped">Shipped ({stats.shipped})</option>
                <option value="delivered">Delivered ({stats.delivered})</option>
                <option value="cancelled">Cancelled ({stats.cancelled})</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Orders ({filteredOrders.length})</CardTitle>
              <button
                onClick={() => exportToCSV(formatOrdersForExport(filteredOrders), 'marketplace-orders')}
                disabled={filteredOrders.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                📥 Export CSV
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📦</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Orders Found</h3>
                <p className="text-gray-600">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your filters' 
                    : 'No orders have been placed yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map(order => (
                  <Link key={order.id} to={`/marketplace-orders/${order.id}`}>
                  <div
                    className="p-4 border-2 border-gray-200 rounded-xl hover:border-purple-200 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">Order #{order.id.slice(0, 8)}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                            {order.status}
                          </span>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Customer:</span> {order.customerName || order.customerEmail}
                          </div>
                          <div>
                            <span className="font-medium">Vendor:</span> {order.sellerName || order.sellerEmail}
                          </div>
                          <div>
                            <span className="font-medium">Items:</span> {order.items?.length || 0}
                          </div>
                          <div>
                            <span className="font-medium">Total:</span> {formatCurrency(order.total)}
                          </div>
                          <div className="md:col-span-2">
                            <span className="font-medium">Date:</span>{' '}
                            {order.createdAt?.toDate?.()?.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            }) || 'Unknown'}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <select
                          value={order.status}
                          onChange={(e) => handleStatusChange(order.id, e.target.value)}
                          disabled={updating === order.id}
                          className="px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-purple-500 disabled:opacity-50"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </div>

                    {/* Order Items */}
                    {order.items && order.items.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-sm font-medium text-gray-700 mb-2">Items:</p>
                        <div className="space-y-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm text-gray-600">
                              <span>{item.quantity}x {item.title}</span>
                              <span className="font-medium">{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

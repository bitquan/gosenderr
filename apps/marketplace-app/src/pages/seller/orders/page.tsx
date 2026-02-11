import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { useAuthUser } from '@/hooks/v2/useAuthUser';
import { Link } from 'react-router-dom';

interface OrderItem {
  itemId: string;
  title: string;
  quantity: number;
  price: number;
  sellerId: string;
}

interface Order {
  id: string;
  customerId: string;
  customerEmail: string;
  items: OrderItem[];
  status: string;
  total: number;
  shippingInfo: {
    fullName: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
  };
  createdAt: any;
}

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  shipped: 'bg-purple-100 text-purple-800',
  delivered: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function SellerOrders() {
  const { uid } = useAuthUser();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month

  useEffect(() => {
    if (!uid) return;
    fetchSellerOrders();
  }, [uid]);

  const fetchSellerOrders = async () => {
    try {
      const ordersQuery = query(
        collection(db, 'orders'),
        where('sellerId', '==', uid)
      );
      const ordersSnapshot = await getDocs(ordersQuery);
      const sellerOrders = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Order[];

      // Sort by date (newest first)
      sellerOrders.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      });

      setOrders(sellerOrders);
    } catch (error) {
      console.error('Error fetching seller orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        status: newStatus,
        updatedAt: new Date(),
      });
      
      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: newStatus } : order
        )
      );
      
      alert('Order status updated successfully!');
    } catch (error) {
      console.error('Error updating order status:', error);
      alert('Failed to update order status');
    }
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter((order) => order.status === filter);

  // Apply search filter
  const searchedOrders = searchQuery
    ? filteredOrders.filter((order) => {
        const query = searchQuery.toLowerCase();
        return (
          order.id.toLowerCase().includes(query) ||
          order.customerEmail.toLowerCase().includes(query) ||
          order.shippingInfo.fullName.toLowerCase().includes(query) ||
          order.items.some((item) => item.title.toLowerCase().includes(query))
        );
      })
    : filteredOrders;

  // Apply date filter
  const finalOrders = searchedOrders.filter((order) => {
    if (dateFilter === 'all') return true;
    
    const orderDate = order.createdAt?.toDate?.();
    if (!orderDate) return false;
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (dateFilter === 'today') {
      return orderDate >= today;
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return orderDate >= weekAgo;
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      return orderDate >= monthAgo;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/95 via-purple-900/90 to-purple-950/95 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Seller Orders</h1>
              <p className="text-gray-600 mt-1">Manage orders for your items</p>
            </div>
            <Link
              to="/seller/dashboard"
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Search and Date Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by order ID, customer name, email, or item..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>

          {/* Filter Tabs */}
          <div className="flex space-x-2 border-b border-gray-200">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 font-medium border-b-2 transition ${
                filter === 'all'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({orders.length})
            </button>
            {STATUS_OPTIONS.map((status) => {
              const count = orders.filter((o) => o.status === status).length;
              return (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-4 py-2 font-medium border-b-2 transition capitalize ${
                    filter === status
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {status} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Results count */}
        {(searchQuery || dateFilter !== 'all') && (
          <div className="mb-4 text-sm text-gray-600">
            Showing {finalOrders.length} of {orders.length} total orders
          </div>
        )}

        {/* Orders List */}
        {finalOrders.length === 0 ? (
          <div className="bg-gradient-to-br from-violet-200/80 via-fuchsia-200/65 to-blue-200/70 border border-violet-200/80 rounded-lg shadow p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📦</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? "You haven't received any orders yet."
                : `No ${filter} orders at the moment.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {finalOrders.map((order) => {
              // Filter items to show only seller's items
              const sellerItems = order.items.filter((item) => item.sellerId === uid);
              const sellerTotal = sellerItems.reduce(
                (sum, item) => sum + item.price * item.quantity,
                0
              );

              return (
                <div key={order.id} className="bg-gradient-to-br from-violet-200/80 via-fuchsia-200/65 to-blue-200/70 border border-violet-200/80 rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Order #{order.id.slice(-8)}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${
                            STATUS_COLORS[order.status]
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {order.createdAt?.toDate?.().toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Your Earnings</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${sellerTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Customer Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Name</p>
                        <p className="font-medium">{order.shippingInfo.fullName}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Email</p>
                        <p className="font-medium">{order.customerEmail}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Phone</p>
                        <p className="font-medium">{order.shippingInfo.phone}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Address</p>
                        <p className="font-medium">
                          {order.shippingInfo.address}, {order.shippingInfo.city}{' '}
                          {order.shippingInfo.state} {order.shippingInfo.zipCode}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Your Items</h4>
                    <div className="space-y-2">
                      {sellerItems.map((item, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-900">
                            {item.title} x {item.quantity}
                          </span>
                          <span className="font-medium text-gray-900">
                            ${(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Update */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <label className="text-sm font-medium text-gray-700">Update Status:</label>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusUpdate(order.id, e.target.value)}
                        className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status} className="capitalize">
                            {status}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Link
                      to={`/orders/${order.id}`}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      View Full Order →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

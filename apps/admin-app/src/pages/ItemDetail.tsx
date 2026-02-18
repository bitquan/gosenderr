import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { doc, getDoc, updateDoc, collection, addDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { formatCurrency } from '../lib/utils'

interface MarketplaceItem {
  id: string
  title: string
  description: string
  price: number
  category: string
  images: string[]
  sellerId: string
  sellerName: string
  sellerEmail?: string
  vendorEmail?: string
  stock: number
  status: 'draft' | 'pending' | 'active' | 'flagged' | 'removed'
  featured: boolean
  views?: number
  sales?: number
  createdAt?: any
  updatedAt?: any
  flagReason?: string
  flaggedAt?: any
  flaggedBy?: string
}

interface Order {
  id: string
  customerId: string
  customerEmail: string
  total: number
  status: string
  createdAt: any
  items?: any[]
}

export default function ItemDetailPage() {
  const { itemId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [item, setItem] = useState<MarketplaceItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [orders, setOrders] = useState<Order[]>([])
  
  // Moderation state
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [removeReason, setRemoveReason] = useState('')
  const [showFlagModal, setShowFlagModal] = useState(false)
  const [flagReason, setFlagReason] = useState('')

  useEffect(() => {
    loadItem()
    loadOrders()
  }, [itemId])

  const loadItem = async () => {
    if (!itemId) return
    
    setLoading(true)
    try {
      const itemDoc = await getDoc(doc(db, 'marketplaceItems', itemId))
      if (itemDoc.exists()) {
        setItem({ id: itemDoc.id, ...itemDoc.data() } as MarketplaceItem)
      }
    } catch (error) {
      console.error('Error loading item:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async () => {
    if (!itemId) return
    
    try {
      const ordersSnap = await getDocs(collection(db, 'orders'))
      const allOrders = ordersSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Order))
        .filter(order => 
          order.items?.some((i: any) => i.itemId === itemId)
        )
        .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis())
      
      setOrders(allOrders.slice(0, 10))
    } catch (error) {
      console.error('Error loading orders:', error)
    }
  }

  const handleApprove = async () => {
    if (!item || !user) return
    
    setUpdating(true)
    try {
      await updateDoc(doc(db, 'marketplaceItems', item.id), {
        status: 'active',
        updatedAt: new Date()
      })

      // Log action
      await addDoc(collection(db, 'adminLogs'), {
        action: 'item_approved',
        adminId: user.uid,
        adminEmail: user.email,
        itemId: item.id,
        itemTitle: item.title,
        sellerId: item.sellerId,
        timestamp: new Date()
      })

      await loadItem()
    } catch (error) {
      console.error('Error approving item:', error)
      alert('Failed to approve item')
    } finally {
      setUpdating(false)
    }
  }

  const handleReject = async () => {
    if (!item || !user) return
    
    if (!confirm('Are you sure you want to reject this item?')) return
    
    setUpdating(true)
    try {
      await updateDoc(doc(db, 'marketplaceItems', item.id), {
        status: 'draft',
        updatedAt: new Date()
      })

      // Log action
      await addDoc(collection(db, 'adminLogs'), {
        action: 'item_rejected',
        adminId: user.uid,
        adminEmail: user.email,
        itemId: item.id,
        itemTitle: item.title,
        sellerId: item.sellerId,
        timestamp: new Date()
      })

      await loadItem()
    } catch (error) {
      console.error('Error rejecting item:', error)
      alert('Failed to reject item')
    } finally {
      setUpdating(false)
    }
  }

  const handleToggleFeatured = async () => {
    if (!item || !user) return
    
    setUpdating(true)
    try {
      const newFeaturedStatus = !item.featured
      await updateDoc(doc(db, 'marketplaceItems', item.id), {
        featured: newFeaturedStatus,
        updatedAt: new Date()
      })

      // Log action
      await addDoc(collection(db, 'adminLogs'), {
        action: newFeaturedStatus ? 'item_featured' : 'item_unfeatured',
        adminId: user.uid,
        adminEmail: user.email,
        itemId: item.id,
        itemTitle: item.title,
        timestamp: new Date()
      })

      await loadItem()
    } catch (error) {
      console.error('Error toggling featured status:', error)
      alert('Failed to update featured status')
    } finally {
      setUpdating(false)
    }
  }

  const handleFlag = async () => {
    if (!item || !user || !flagReason.trim()) return
    
    setUpdating(true)
    try {
      await updateDoc(doc(db, 'marketplaceItems', item.id), {
        status: 'flagged',
        flagReason: flagReason,
        flaggedAt: new Date(),
        flaggedBy: user.uid,
        updatedAt: new Date()
      })

      // Log action
      await addDoc(collection(db, 'adminLogs'), {
        action: 'item_flagged',
        adminId: user.uid,
        adminEmail: user.email,
        itemId: item.id,
        itemTitle: item.title,
        details: { reason: flagReason },
        timestamp: new Date()
      })

      setShowFlagModal(false)
      setFlagReason('')
      await loadItem()
    } catch (error) {
      console.error('Error flagging item:', error)
      alert('Failed to flag item')
    } finally {
      setUpdating(false)
    }
  }

  const handleUnflag = async () => {
    if (!item || !user) return
    
    setUpdating(true)
    try {
      await updateDoc(doc(db, 'marketplaceItems', item.id), {
        status: 'active',
        flagReason: null,
        flaggedAt: null,
        flaggedBy: null,
        updatedAt: new Date()
      })

      // Log action
      await addDoc(collection(db, 'adminLogs'), {
        action: 'item_unflagged',
        adminId: user.uid,
        adminEmail: user.email,
        itemId: item.id,
        itemTitle: item.title,
        timestamp: new Date()
      })

      await loadItem()
    } catch (error) {
      console.error('Error unflagging item:', error)
      alert('Failed to unflag item')
    } finally {
      setUpdating(false)
    }
  }

  const handleRemove = async () => {
    if (!item || !user || !removeReason.trim()) return
    
    setUpdating(true)
    try {
      await updateDoc(doc(db, 'marketplaceItems', item.id), {
        status: 'removed',
        removeReason: removeReason,
        removedAt: new Date(),
        removedBy: user.uid,
        updatedAt: new Date()
      })

      // Log action
      await addDoc(collection(db, 'adminLogs'), {
        action: 'item_removed',
        adminId: user.uid,
        adminEmail: user.email,
        itemId: item.id,
        itemTitle: item.title,
        details: { reason: removeReason },
        timestamp: new Date()
      })

      setShowRemoveModal(false)
      setRemoveReason('')
      await loadItem()
    } catch (error) {
      console.error('Error removing item:', error)
      alert('Failed to remove item')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!item || !user) return
    
    if (!confirm('Are you sure you want to permanently DELETE this item? This cannot be undone!')) return
    
    setUpdating(true)
    try {
      await deleteDoc(doc(db, 'marketplaceItems', item.id))

      // Log action
      await addDoc(collection(db, 'adminLogs'), {
        action: 'item_deleted',
        adminId: user.uid,
        adminEmail: user.email,
        itemId: item.id,
        itemTitle: item.title,
        timestamp: new Date()
      })

      navigate('/marketplace-items')
    } catch (error) {
      console.error('Error deleting item:', error)
      alert('Failed to delete item')
      setUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Review' },
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      flagged: { color: 'bg-red-100 text-red-800', label: 'Flagged' },
      removed: { color: 'bg-red-100 text-red-800', label: 'Removed' }
    }
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-800', label: status }
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        {badge.label}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading item...</p>
        </div>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-gray-600">Item not found</p>
          <Link to="/marketplace-items" className="text-purple-600 hover:underline mt-4 inline-block">
            Back to Items
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <Link to="/marketplace-items" className="text-white/80 hover:text-white mb-2 inline-block">
            ← Back to Items
          </Link>
          <h1 className="text-3xl font-bold mb-2">📦 Item Details</h1>
          <p className="text-purple-100">{item.title}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        {/* Item Info */}
        <Card variant="elevated">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Item Information</CardTitle>
                <div className="mt-2 space-x-2">
                  {getStatusBadge(item.status)}
                  {item.featured && (
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                      ⭐ Featured
                    </span>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Images */}
              <div>
                <h3 className="font-semibold mb-3">Images</h3>
                <div className="grid grid-cols-2 gap-3">
                  {item.images?.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`${item.title} ${idx + 1}`}
                      className="w-full h-40 object-cover rounded-lg border-2 border-gray-200"
                    />
                  ))}
                  {(!item.images || item.images.length === 0) && (
                    <div className="w-full h-40 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-gray-400">No images</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Price</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(item.price)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Stock</p>
                  <p className="font-medium">{item.stock} units</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium">{item.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Seller</p>
                  <Link to={`/users/${item.sellerId}`} className="font-medium text-purple-600 hover:underline">
                    {item.sellerName || item.vendorEmail}
                  </Link>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Views / Sales</p>
                  <p className="font-medium">{item.views || 0} views / {item.sales || 0} sales</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="font-medium">
                    {item.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{item.description}</p>
            </div>

            {item.status === 'flagged' && item.flagReason && (
              <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">🚩 Flag Reason</h3>
                <p className="text-red-700">{item.flagReason}</p>
                <p className="text-sm text-red-600 mt-2">
                  Flagged on {item.flaggedAt?.toDate?.()?.toLocaleString()}
                </p>
              </div>
            )}

            {item.status === 'removed' && (item as any).removeReason && (
              <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                <h3 className="font-semibold text-red-800 mb-2">❌ Removal Reason</h3>
                <p className="text-red-700">{(item as any).removeReason}</p>
                <p className="text-sm text-red-600 mt-2">
                  Removed on {(item as any).removedAt?.toDate?.()?.toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Moderation Actions */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>🔧 Moderation Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {item.status === 'pending' && (
                <>
                  <button
                    onClick={handleApprove}
                    disabled={updating}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    ✅ Approve Item
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={updating}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                  >
                    ❌ Reject Item
                  </button>
                </>
              )}

              {item.status === 'active' && (
                <button
                  onClick={handleToggleFeatured}
                  disabled={updating}
                  className={`px-6 py-3 rounded-lg font-medium ${
                    item.featured
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  } disabled:opacity-50`}
                >
                  {item.featured ? '⭐ Unfeature' : '⭐ Feature on Homepage'}
                </button>
              )}

              {item.status !== 'flagged' && item.status !== 'removed' && (
                <button
                  onClick={() => setShowFlagModal(true)}
                  disabled={updating}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
                >
                  🚩 Flag Item
                </button>
              )}

              {item.status === 'flagged' && (
                <button
                  onClick={handleUnflag}
                  disabled={updating}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  ✓ Unflag Item
                </button>
              )}

              {item.status !== 'removed' && (
                <button
                  onClick={() => setShowRemoveModal(true)}
                  disabled={updating}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  🗑️ Remove Item
                </button>
              )}

              <button
                onClick={handleDelete}
                disabled={updating}
                className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 font-medium"
              >
                💀 Delete Permanently
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Recent Orders */}
        {orders.length > 0 && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>📦 Recent Orders ({orders.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {orders.map(order => (
                  <Link
                    key={order.id}
                    to={`/marketplace-orders/${order.id}`}
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100"
                  >
                    <div>
                      <p className="font-medium">Order #{order.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-600">{order.customerEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-purple-600">{formatCurrency(order.total)}</p>
                      <p className="text-sm text-gray-600">
                        {order.createdAt?.toDate?.()?.toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card variant="elevated" className="max-w-md w-full">
            <CardHeader>
              <CardTitle>🚩 Flag Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Reason for Flagging</label>
                  <textarea
                    value={flagReason}
                    onChange={(e) => setFlagReason(e.target.value)}
                    placeholder="Describe why this item is being flagged..."
                    className="w-full p-3 border-2 border-gray-200 rounded-lg"
                    rows={4}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleFlag}
                    disabled={updating || !flagReason.trim()}
                    className="flex-1 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 font-medium"
                  >
                    Flag Item
                  </button>
                  <button
                    onClick={() => {
                      setShowFlagModal(false)
                      setFlagReason('')
                    }}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Remove Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card variant="elevated" className="max-w-md w-full">
            <CardHeader>
              <CardTitle>🗑️ Remove Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-700">
                  This will remove the item from the marketplace. The item can be restored later.
                </p>
                <div>
                  <label className="block text-sm font-medium mb-2">Reason for Removal</label>
                  <textarea
                    value={removeReason}
                    onChange={(e) => setRemoveReason(e.target.value)}
                    placeholder="Describe why this item is being removed..."
                    className="w-full p-3 border-2 border-gray-200 rounded-lg"
                    rows={4}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleRemove}
                    disabled={updating || !removeReason.trim()}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
                  >
                    Remove Item
                  </button>
                  <button
                    onClick={() => {
                      setShowRemoveModal(false)
                      setRemoveReason('')
                    }}
                    className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

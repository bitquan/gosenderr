import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc, Timestamp, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import EditRoleModal from '../components/EditRoleModal'
import BanUserModal from '../components/BanUserModal'

interface AdminLog {
  id: string
  action: string
  userId: string
  timestamp: any
  adminEmail: string
  reason?: string
  details?: any
}

interface User {
  id: string
  email: string
  phone?: string
  name?: string
  displayName?: string
  role?: string
  admin?: boolean
  banned?: boolean
  banReason?: string
  suspended?: boolean
  suspendedUntil?: any
  suspensionReason?: string
  courierProfile?: {
    online?: boolean
    vehicleType?: string
    approved?: boolean
    rating?: number
    completedDeliveries?: number
    licenseNumber?: string
  }
  vendorProfile?: {
    storeName?: string
    businessName?: string
    verified?: boolean
    rating?: number
    totalSales?: number
    verifiedAt?: any
  }
  profilePicture?: string
  address?: {
    street?: string
    city?: string
    state?: string
    zip?: string
    country?: string
  }
  createdAt?: any
  lastLoginAt?: any
  lastActive?: any
}

export default function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [editRoleModalOpen, setEditRoleModalOpen] = useState(false)
  const [banModalOpen, setBanModalOpen] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [suspendDays, setSuspendDays] = useState('7')
  const [suspendReason, setSuspendReason] = useState('')
  const [userStats, setUserStats] = useState({
    ordersPlaced: 0,
    itemsListed: 0,
    deliveriesMade: 0,
    totalSpent: 0,
    totalEarned: 0,
  })
  const [activityLogs, setActivityLogs] = useState<AdminLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadUser()
      loadActivityLogs()
    }
  }, [userId])

  const loadUser = async () => {
    if (!userId) return
    
    try {
      const userDoc = await getDoc(doc(db, 'users', userId))
      
      if (userDoc.exists()) {
        const data = { id: userDoc.id, ...userDoc.data() } as User
        setUser(data)
        await loadUserStats()
      } else {
        console.error('User not found')
      }
    } catch (error) {
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadActivityLogs = async () => {
    if (!userId) return
    
    try {
      setLogsLoading(true)
      const logsQuery = query(
        collection(db, 'adminLogs'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      )
      const logsSnap = await getDocs(logsQuery)
      const logs = logsSnap.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as AdminLog[]
      setActivityLogs(logs)
    } catch (error) {
      console.error('Error loading activity logs:', error)
      // Silently fail - if there's no index, just show empty
      setActivityLogs([])
    } finally {
      setLogsLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'user_created':
        return '👤'
      case 'user_role_changed':
        return '🔄'
      case 'user_banned':
        return '🚫'
      case 'user_unbanned':
        return '✅'
      case 'user_suspended':
        return '⚠️'
      case 'user_unsuspended':
        return '🔓'
      case 'user_deleted':
        return '🗑️'
      default:
        return '📝'
    }
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      user_created: 'User Created',
      user_role_changed: 'Role Changed',
      user_banned: 'User Banned',
      user_unbanned: 'User Unbanned',
      user_suspended: 'User Suspended',
      user_unsuspended: 'User Unsuspended',
      user_deleted: 'User Deleted',
    }
    return labels[action] || action.replace(/_/g, ' ').toUpperCase()
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate?.() || new Date(timestamp)
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  const loadUserStats = async () => {
    try {
      // Count orders
      const ordersSnap = await getDocs(
        query(collection(db, 'orders'), where('customerId', '==', userId!))
      )
      const ordersTotal = ordersSnap.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0)

      // Count vendor items
      const itemsSnap = await getDocs(
        query(collection(db, 'marketplaceItems'), where('vendorId', '==', userId!))
      )

      // Count courier deliveries
      const deliveriesSnap = await getDocs(
        query(collection(db, 'orders'), where('courierId', '==', userId!))
      )
      const deliveriesTotal = deliveriesSnap.docs.reduce((sum, doc) => sum + (doc.data().total || 0), 0)

      setUserStats({
        ordersPlaced: ordersSnap.size,
        itemsListed: itemsSnap.size,
        deliveriesMade: deliveriesSnap.size,
        totalSpent: ordersTotal,
        totalEarned: deliveriesTotal,
      })
    } catch (error) {
      console.error('Error loading user stats:', error)
    }
  }

  const handleBanUser = async () => {
    if (!user || !userId) return
    
    setUpdating(true)
    try {
      await updateDoc(doc(db, 'users', userId), {
        banned: !user.banned,
        bannedAt: user.banned ? null : Timestamp.now()
      })

      await addDoc(collection(db, 'adminLogs'), {
        action: user.banned ? 'user_unbanned' : 'user_banned',
        userId,
        timestamp: Timestamp.now(),
        adminEmail: 'admin@example.com'
      })

      await loadUser()
      setBanModalOpen(false)
    } catch (error) {
      console.error('Error updating user ban status:', error)
      alert('Failed to update user ban status')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!user) return
    try {
      await deleteDoc(doc(db, 'users', user.id))
      // Log action
      await addDoc(collection(db, 'adminLogs'), {
        adminId: 'current-admin',
        userId: user.id,
        action: 'DELETE_USER',
        description: `Permanently deleted user account`,
        timestamp: Timestamp.now(),
        changes: { deleted: true }
      })
      navigate('/users')
    } catch (error) {
      console.error('Error deleting user:', error)
    }
  }

  const handleSuspendUser = async () => {
    if (!user || !userId) return
    
    const days = parseInt(suspendDays)
    if (isNaN(days) || days <= 0) {
      alert('Please enter a valid number of days')
      return
    }

    if (!suspendReason.trim()) {
      alert('Please provide a suspension reason')
      return
    }

    setUpdating(true)
    try {
      const suspendUntil = new Date()
      suspendUntil.setDate(suspendUntil.getDate() + days)

      await updateDoc(doc(db, 'users', userId), {
        suspended: true,
        suspendedUntil: Timestamp.fromDate(suspendUntil),
        suspensionReason: suspendReason
      })

      await addDoc(collection(db, 'adminLogs'), {
        action: 'user_suspended',
        userId,
        timestamp: Timestamp.now(),
        adminEmail: 'admin@example.com',
        reason: suspendReason,
        days
      })

      setShowSuspendModal(false)
      setSuspendReason('')
      await loadUser()
    } catch (error) {
      console.error('Error suspending user:', error)
      alert('Failed to suspend user')
    } finally {
      setUpdating(false)
    }
  }

  const handleUnsuspendUser = async () => {
    if (!user || !userId) return
    
    setUpdating(true)
    try {
      await updateDoc(doc(db, 'users', userId), {
        suspended: false,
        suspendedUntil: null,
        suspensionReason: null
      })

      await addDoc(collection(db, 'adminLogs'), {
        action: 'user_unsuspended',
        userId,
        timestamp: Timestamp.now(),
        adminEmail: 'admin@example.com'
      })

      await loadUser()
    } catch (error) {
      console.error('Error unsuspending user:', error)
      alert('Failed to unsuspend user')
    } finally {
      setUpdating(false)
    }
  }

  const handleChangeRole = async () => {
    // This is called from EditRoleModal
    // which handles the actual role change
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading user details...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">User not found</p>
          <Link to="/users" className="text-purple-600 hover:underline mt-4 block">
            Back to Users
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <Link to="/users" className="inline-flex items-center gap-2 mb-4 hover:opacity-80 transition">
            <span>←</span>
            <span>Back to Users</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl font-bold">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="profile" className="w-full h-full rounded-full object-cover" />
              ) : (
                user.email?.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{user.name || user.displayName || user.email}</h1>
              <p className="text-purple-100">{user.email}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {user.role === 'admin' && (
                  <span className="px-2 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Admin</span>
                )}
                {user.role === 'vendor' && (
                  <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">🏪 Vendor</span>
                )}
                {user.role === 'courier' && (
                  <span className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">Courier</span>
                )}
                {user.role === 'package_runner' && (
                  <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold">🚛 Package Runner</span>
                )}
                {!user.role && (
                  <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">Customer</span>
                )}
                {user.banned && (
                  <span className="px-2 py-1 rounded-full bg-red-500 text-white text-xs font-semibold">🚫 BANNED</span>
                )}
                {user.suspended && (
                  <span className="px-2 py-1 rounded-full bg-orange-500 text-white text-xs font-semibold">⚠️ SUSPENDED</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-end">
          <button
            onClick={() => setEditRoleModalOpen(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-semibold text-sm"
          >
            Edit Role
          </button>
          {user.suspended ? (
            <button
              onClick={async () => {
                setUpdating(true)
                try {
                  await updateDoc(doc(db, 'users', user.id), {
                    suspended: false,
                    suspendedUntil: null,
                    suspensionReason: null
                  })
                  await addDoc(collection(db, 'adminLogs'), {
                    action: 'user_unsuspended',
                    userId: user.id,
                    timestamp: Timestamp.now(),
                    adminEmail: 'admin@example.com'
                  })
                  await loadUser()
                } finally {
                  setUpdating(false)
                }
              }}
              disabled={updating}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-sm disabled:opacity-50"
            >
              Unsuspend User
            </button>
          ) : (
            <button
              onClick={() => setShowSuspendModal(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition font-semibold text-sm"
            >
              Suspend User
            </button>
          )}
          <button
            onClick={() => setBanModalOpen(true)}
            className={`px-4 py-2 rounded-lg transition font-semibold text-sm ${
              user.banned
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            {user.banned ? 'Unban User' : 'Ban User'}
          </button>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition font-semibold text-sm"
          >
            Delete
          </button>
        </div>

        {/* User Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Contact Information */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>📋 Contact Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 font-semibold">Email</p>
                  <p className="text-gray-900">{user.email}</p>
                </div>
                {user.phone && (
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Phone</p>
                    <p className="text-gray-900">{user.phone}</p>
                  </div>
                )}
                {user.address && (
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Address</p>
                    <p className="text-gray-900 text-sm">
                      {user.address.street && `${user.address.street}, `}
                      {user.address.city && `${user.address.city}, `}
                      {user.address.state && `${user.address.state} `}
                      {user.address.zip}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Account Status */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>📅 Account Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500 font-semibold">Member Since</p>
                  <p className="text-gray-900">{formatDate(user.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-semibold">Last Active</p>
                  <p className="text-gray-900">{formatDate(user.lastActive || user.lastLoginAt)}</p>
                </div>
                {user.banned && (
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Ban Reason</p>
                    <p className="text-red-700 font-semibold">{user.banReason || 'No reason provided'}</p>
                  </div>
                )}
                {user.suspended && (
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Suspended Until</p>
                    <p className="text-orange-700 font-semibold">{formatDate(user.suspendedUntil)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Role-Specific Sections */}
        {(user.role === 'customer' || !user.role) && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>🛍️ Customer Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600 font-semibold">Orders Placed</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{userStats.ordersPlaced}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600 font-semibold">Total Spent</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">${userStats.totalSpent.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {user.role === 'vendor' && user.vendorProfile && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>🏪 Vendor Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-indigo-50 rounded-lg">
                    <p className="text-sm text-gray-600 font-semibold">Items Listed</p>
                    <p className="text-3xl font-bold text-indigo-600 mt-1">{userStats.itemsListed}</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-600 font-semibold">Rating</p>
                    <p className="text-2xl font-bold text-yellow-600 mt-1">
                      {user.vendorProfile?.rating?.toFixed(1) || 'N/A'} ⭐
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 font-semibold">Total Sales</p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">${user.vendorProfile?.totalSales?.toFixed(2) || '0.00'}</p>
                  </div>
                </div>
                {user.vendorProfile?.businessName && (
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Business Name</p>
                    <p className="text-gray-900">{user.vendorProfile.businessName}</p>
                  </div>
                )}
                {user.vendorProfile?.verified && (
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Verification Status</p>
                    <p className="text-gray-900 text-green-600 font-semibold">
                      ✓ Verified {user.vendorProfile.verifiedAt && `on ${formatDate(user.vendorProfile.verifiedAt)}`}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {user.role === 'courier' && user.courierProfile && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>🚗 Courier Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <p className="text-sm text-gray-600 font-semibold">Deliveries</p>
                    <p className="text-3xl font-bold text-purple-600 mt-1">{userStats.deliveriesMade}</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="text-sm text-gray-600 font-semibold">Rating</p>
                    <p className="text-2xl font-bold text-yellow-600 mt-1">
                      {user.courierProfile?.rating?.toFixed(1) || 'N/A'} ⭐
                    </p>
                  </div>
                  <div className={`p-4 rounded-lg ${user.courierProfile?.online ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <p className="text-sm text-gray-600 font-semibold">Status</p>
                    <p className={`text-lg font-bold mt-1 ${user.courierProfile?.online ? 'text-green-600' : 'text-gray-600'}`}>
                      {user.courierProfile?.online ? '🟢 Online' : '⚪ Offline'}
                    </p>
                  </div>
                </div>
                {user.courierProfile?.vehicleType && (
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Vehicle Type</p>
                    <p className="text-gray-900 capitalize">{user.courierProfile.vehicleType}</p>
                  </div>
                )}
                {user.courierProfile?.licenseNumber && (
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">License Number</p>
                    <p className="text-gray-900">{user.courierProfile.licenseNumber}</p>
                  </div>
                )}
                {user.courierProfile?.approved !== undefined && (
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Approval Status</p>
                    <p className={`${user.courierProfile.approved ? 'text-green-600' : 'text-red-600'} font-semibold`}>
                      {user.courierProfile.approved ? '✅ Approved' : '❌ Pending'}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Activity Timeline */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>📊 Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="text-center py-8 text-gray-600">Loading activity...</div>
            ) : activityLogs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No activity recorded yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activityLogs.map((log, index) => (
                  <div key={log.id} className="flex gap-4 relative">
                    {/* Timeline line */}
                    {index !== activityLogs.length - 1 && (
                      <div className="absolute left-4 top-12 w-1 h-12 bg-gradient-to-b from-purple-300 to-transparent"></div>
                    )}
                    
                    {/* Icon */}
                    <div className="relative flex-shrink-0 w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center text-lg border-2 border-purple-300">
                      {getActionIcon(log.action)}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 py-1">
                      <p className="font-semibold text-gray-900">{getActionLabel(log.action)}</p>
                      <div className="flex flex-col gap-1 text-sm text-gray-600 mt-1">
                        <span>By: <span className="font-medium text-gray-800">{log.adminEmail || 'System'}</span></span>
                        <span>Time: <span className="font-medium text-gray-800">{formatDate(log.timestamp)}</span></span>
                        {log.reason && (
                          <div className="mt-2 p-2 bg-gray-100 rounded">
                            <p className="text-sm text-gray-700"><strong>Reason:</strong> {log.reason}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete User?</h3>
            <p className="text-gray-600 mb-6">This will permanently delete {user.email} and all associated data. This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleDeleteUser()
                  setShowDeleteConfirm(false)
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Suspend User</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Suspend Duration (days)</label>
                <input
                  type="number"
                  min="1"
                  value={suspendDays}
                  onChange={(e) => setSuspendDays(e.target.value)}
                  placeholder="7"
                  className="w-full p-2 border rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Reason for Suspension</label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="Explain why this user is being suspended..."
                  className="w-full p-2 border rounded h-24 resize-none"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowSuspendModal(false)
                    setSuspendReason('')
                  }}
                  disabled={updating}
                  className="flex-1 px-4 py-2 border rounded hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const days = parseInt(suspendDays)
                    if (isNaN(days) || days <= 0) {
                      alert('Please enter a valid number of days')
                      return
                    }
                    if (!suspendReason.trim()) {
                      alert('Please provide a suspension reason')
                      return
                    }
                    setUpdating(true)
                    try {
                      const suspendUntil = new Date()
                      suspendUntil.setDate(suspendUntil.getDate() + days)
                      await updateDoc(doc(db, 'users', user.id), {
                        suspended: true,
                        suspendedUntil: Timestamp.fromDate(suspendUntil),
                        suspensionReason: suspendReason
                      })
                      await addDoc(collection(db, 'adminLogs'), {
                        action: 'user_suspended',
                        userId: user.id,
                        timestamp: Timestamp.now(),
                        adminEmail: 'admin@example.com',
                        reason: suspendReason,
                        days
                      })
                      setShowSuspendModal(false)
                      setSuspendReason('')
                      await loadUser()
                    } catch (error) {
                      console.error('Error suspending user:', error)
                      alert('Failed to suspend user')
                    } finally {
                      setUpdating(false)
                    }
                  }}
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
                >
                  {updating ? 'Suspending...' : 'Suspend User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <EditRoleModal
        user={user}
        isOpen={editRoleModalOpen}
        onClose={() => setEditRoleModalOpen(false)}
        onSuccess={() => {
          loadUser()
          setEditRoleModalOpen(false)
        }}
      />

      <BanUserModal
        user={user}
        isOpen={banModalOpen}
        onClose={() => setBanModalOpen(false)}
        onSuccess={() => {
          loadUser()
          setBanModalOpen(false)
        }}
      />
    </div>
  )
}

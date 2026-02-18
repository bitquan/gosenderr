import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDoc, collection, doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { useAuth } from '../hooks/useAuth'

interface SellerApplication {
  id: string
  userId: string
  businessName?: string
  businessType?: string
  description?: string
  phone?: string
  website?: string
  storefront?: boolean
  status?: 'pending' | 'approved' | 'rejected'
  createdAt?: any
  updatedAt?: any
  approvedAt?: any
  approvedBy?: string
  rejectedAt?: any
  rejectedBy?: string
  rejectionReason?: string
  documents?: Array<{
    label: string
    url: string
    name: string
    contentType: string
    uploadedAt?: any
  }>
  user?: {
    email?: string
    displayName?: string
    roles?: string[]
    role?: string
  }
}

export default function SellerApprovalPage() {
  const { user } = useAuth()
  const [applications, setApplications] = useState<SellerApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [processing, setProcessing] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingSellerId, setRejectingSellerId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'sellerApplications'), async (snapshot) => {
      const baseApps = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() as Omit<SellerApplication, 'id' | 'userId' | 'user'>
        return {
          ...data,
          id: docSnap.id,
          userId: docSnap.id,
        }
      })

      const enriched = await Promise.all(
        baseApps.map(async (app) => {
          try {
            const userSnap = await getDoc(doc(db, 'users', app.userId))
            if (userSnap.exists()) {
              const userData = userSnap.data() as SellerApplication['user']
              return { ...app, user: userData }
            }
          } catch (error) {
            console.error('Failed to load seller user data:', error)
          }
          return app
        })
      )

      setApplications(enriched)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const logAdminAction = async (action: string, sellerId: string, payload?: Record<string, any>) => {
    await addDoc(collection(db, 'adminLogs'), {
      action,
      adminId: user?.uid || 'admin',
      adminEmail: user?.email || 'admin',
      userId: sellerId,
      timestamp: new Date(),
      ...payload,
    })
  }

  const handleApprove = async (sellerId: string, businessName?: string) => {
    setProcessing(sellerId)
    try {
      await updateDoc(doc(db, 'sellerApplications', sellerId), {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: user?.uid || 'admin',
        updatedAt: serverTimestamp(),
      })

      const userRef = doc(db, 'users', sellerId)
      const userSnap = await getDoc(userRef)
      const userData = userSnap.exists() ? userSnap.data() : {}
      const existingRoles = Array.isArray(userData?.roles) ? userData.roles : []
      const nextRoles = Array.from(new Set([...existingRoles, 'seller']))

      await updateDoc(userRef, {
        roles: nextRoles,
        sellerApplication: {
          status: 'approved',
          approvedAt: serverTimestamp(),
        },
        'sellerProfile.status': 'approved',
        'sellerProfile.businessName': businessName || userData?.sellerProfile?.businessName || undefined,
        'sellerProfile.isActive': true,
        'sellerProfile.joinedAsSellerAt': serverTimestamp(),
        'sellerProfile.activeListings': userData?.sellerProfile?.activeListings || 0,
        'sellerProfile.ratingAvg': userData?.sellerProfile?.ratingAvg || 0,
        'sellerProfile.ratingCount': userData?.sellerProfile?.ratingCount || 0,
        updatedAt: serverTimestamp(),
      })

      await logAdminAction('seller_application_approved', sellerId, {
        businessName: businessName || null,
        newStatus: 'approved',
      })

      alert('Seller approved successfully')
    } catch (error: any) {
      console.error('Error approving seller:', error)
      alert(`Failed to approve: ${error.message}`)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (sellerId: string, reason?: string) => {
    if (!reason) {
      setRejectingSellerId(sellerId)
      setShowRejectModal(true)
      return
    }

    setProcessing(sellerId)
    try {
      await updateDoc(doc(db, 'sellerApplications', sellerId), {
        status: 'rejected',
        rejectionReason: reason,
        rejectedAt: serverTimestamp(),
        rejectedBy: user?.uid || 'admin',
        updatedAt: serverTimestamp(),
      })

      await updateDoc(doc(db, 'users', sellerId), {
        sellerApplication: {
          status: 'rejected',
          rejectionReason: reason,
          rejectedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      })

      await logAdminAction('seller_application_rejected', sellerId, {
        reason,
        newStatus: 'rejected',
      })

      alert('Seller application rejected')
      setShowRejectModal(false)
      setRejectingSellerId(null)
      setRejectionReason('')
    } catch (error: any) {
      console.error('Error rejecting seller:', error)
      alert(`Failed to reject: ${error.message}`)
    } finally {
      setProcessing(null)
    }
  }

  const filteredApplications = applications
    .filter((app) => {
      if (filter === 'all') return true
      return app.status === filter
    })
    .filter((app) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        app.businessName?.toLowerCase().includes(q) ||
        app.user?.email?.toLowerCase().includes(q) ||
        app.user?.displayName?.toLowerCase().includes(q) ||
        app.phone?.toLowerCase().includes(q)
      )
    })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <p className="text-gray-600">Loading seller applications...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#2563EB] to-[#7C3AED] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
          >
            <span className="mr-2">←</span>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">🏪 Seller Applications</h1>
          <p className="text-blue-100">{filteredApplications.length} applications</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 flex-wrap">
          {[
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'All', value: 'all' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as any)}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all capitalize ${
                filter === tab.value
                  ? 'bg-gradient-to-br from-[#2563EB] to-[#7C3AED] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredApplications.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🏪</div>
              <p className="text-gray-600 text-lg">
                No {filter !== 'all' ? filter : ''} applications
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app) => {
              const isPending = app.status === 'pending'
              return (
                <Card key={app.id} variant="elevated">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar fallback={app.user?.displayName || app.user?.email || app.businessName} size="lg" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-bold text-gray-900 text-lg">
                              {app.businessName || app.user?.displayName || 'No name'}
                            </p>
                            <p className="text-sm text-gray-500">{app.user?.email}</p>
                          </div>
                          <StatusBadge
                            status={
                              app.status === 'approved'
                                ? 'completed'
                                : app.status === 'rejected'
                                  ? 'cancelled'
                                  : 'pending'
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 mb-4">
                      {app.businessType && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Business Type</p>
                          <p className="font-medium capitalize">{app.businessType.replace('_', ' ')}</p>
                        </div>
                      )}

                      {app.phone && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Phone</p>
                          <p className="font-medium">{app.phone}</p>
                        </div>
                      )}

                      {app.website && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Website</p>
                          <a
                            href={app.website}
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-indigo-600 hover:underline"
                          >
                            {app.website}
                          </a>
                        </div>
                      )}

                      {typeof app.storefront === 'boolean' && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Storefront</p>
                          <p className="font-medium">{app.storefront ? 'Yes' : 'No'}</p>
                        </div>
                      )}
                    </div>

                    {app.description && (
                      <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl mb-4">
                        <p className="text-xs text-indigo-500 mb-1">Business Description</p>
                        <p className="text-sm text-indigo-900">{app.description}</p>
                      </div>
                    )}

                    {app.documents && app.documents.length > 0 && (
                      <div className="p-3 bg-white border border-gray-200 rounded-xl mb-4">
                        <p className="text-xs text-gray-500 mb-2">Uploaded Documents</p>
                        <div className="space-y-2">
                          {app.documents.map((docItem) => (
                            <div key={docItem.url} className="flex items-center justify-between text-sm">
                              <span className="text-gray-700">{docItem.label}: {docItem.name}</span>
                              <a
                                href={docItem.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-600 hover:underline"
                              >
                                View
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {app.rejectionReason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                        <p className="text-xs text-red-500 mb-1">Rejection Reason</p>
                        <p className="text-sm text-red-900">{app.rejectionReason}</p>
                      </div>
                    )}

                    {isPending && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(app.id, app.businessName)}
                          disabled={processing === app.id}
                          className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all disabled:opacity-50"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleReject(app.id)}
                          disabled={processing === app.id}
                          className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
                        >
                          ❌ Reject
                        </button>
                      </div>
                    )}

                    {app.approvedAt && (
                      <div className="text-xs text-gray-500 mt-3">
                        Approved on {app.approvedAt.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reject Seller Application</h2>

            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                ⚠️ This will reject the seller application. They will be notified.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rejection Reason *
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectingSellerId(null)
                  setRejectionReason('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectingSellerId) {
                    handleReject(rejectingSellerId, rejectionReason)
                  }
                }}
                disabled={!rejectionReason.trim() || processing !== null}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
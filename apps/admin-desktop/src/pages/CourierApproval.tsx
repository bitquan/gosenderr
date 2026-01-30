import { useEffect, useState } from 'react'
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { Link } from 'react-router-dom'

interface Courier {
  id: string
  email: string
  displayName?: string
  role?: string
  courierProfile?: {
    status?: string
    phone?: string
    vehicleType?: string
    equipment?: string[]
    availability?: string
    appliedAt?: any
    approvedAt?: any
    rejectedAt?: any
    rejectionReason?: string
  }
}

export default function CourierApprovalPage() {
  const [couriers, setCouriers] = useState<Courier[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [processing, setProcessing] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCouriers, setSelectedCouriers] = useState<string[]>([])
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingCourierId, setRejectingCourierId] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'))

    const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
      const couriersData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Courier))
        .filter(user => user.role === 'courier' && user.courierProfile)
      
      setCouriers(couriersData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleApprove = async (courierId: string) => {
    setProcessing(courierId)
    try {
      await updateDoc(doc(db, 'users', courierId), {
        'courierProfile.status': 'approved',
        'courierProfile.approvedAt': new Date(),
        'courierProfile.approvedBy': 'admin'
      })
      alert('Courier approved successfully')
    } catch (error: any) {
      console.error('Error approving courier:', error)
      alert(`Failed to approve: ${error.message}`)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (courierId: string, reason?: string) => {
    if (!reason) {
      setRejectingCourierId(courierId)
      setShowRejectModal(true)
      return
    }

    setProcessing(courierId)
    try {
      await updateDoc(doc(db, 'users', courierId), {
        'courierProfile.status': 'rejected',
        'courierProfile.rejectedAt': new Date(),
        'courierProfile.rejectedBy': 'admin',
        'courierProfile.rejectionReason': reason
      })
      alert('Courier application rejected')
      setShowRejectModal(false)
      setRejectingCourierId(null)
      setRejectionReason('')
    } catch (error: any) {
      console.error('Error rejecting courier:', error)
      alert(`Failed to reject: ${error.message}`)
    } finally {
      setProcessing(null)
    }
  }

  const handleBulkApprove = async () => {
    if (!window.confirm(`Approve ${selectedCouriers.length} couriers?`)) return

    for (const courierId of selectedCouriers) {
      await handleApprove(courierId)
    }
    setSelectedCouriers([])
  }

  const toggleSelectCourier = (courierId: string) => {
    setSelectedCouriers(prev => 
      prev.includes(courierId) 
        ? prev.filter(id => id !== courierId)
        : [...prev, courierId]
    )
  }

  const filteredCouriers = couriers
    .filter((courier) => {
      if (filter === 'all') return true
      return courier.courierProfile?.status === filter
    })
    .filter((courier) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        courier.email?.toLowerCase().includes(q) ||
        courier.displayName?.toLowerCase().includes(q) ||
        courier.courierProfile?.phone?.includes(q)
      )
    })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <p className="text-gray-600">Loading couriers...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
          >
            <span className="mr-2">←</span>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">⚡ Courier Applications</h1>
          <p className="text-purple-100">{filteredCouriers.length} applications</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 flex-wrap">
          {[
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'All', value: 'all' }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as any)}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all capitalize ${
                filter === tab.value
                  ? 'bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedCouriers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center justify-between">
            <span className="text-gray-700 font-semibold">
              {selectedCouriers.length} courier{selectedCouriers.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Approve Selected
              </button>
              <button
                onClick={() => setSelectedCouriers([])}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Couriers List */}
        {filteredCouriers.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">⚡</div>
              <p className="text-gray-600 text-lg">
                No {filter !== 'all' ? filter : ''} applications
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredCouriers.map((courier) => {
              const profile = courier.courierProfile
              const isSelected = selectedCouriers.includes(courier.id)
              const isPending = profile?.status === 'pending'
              return (
                <Card key={courier.id} variant="elevated">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      {/* Checkbox for bulk selection */}
                      {isPending && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectCourier(courier.id)}
                          className="mt-2 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                      )}
                      
                      <Avatar
                        fallback={courier.displayName || courier.email}
                        size="lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-bold text-gray-900 text-lg">
                              {courier.displayName || 'No name'}
                            </p>
                            <p className="text-sm text-gray-500">{courier.email}</p>
                          </div>
                          <StatusBadge 
                            status={
                              profile?.status === 'approved' ? 'completed' : 
                              profile?.status === 'rejected' ? 'cancelled' : 
                              'pending'
                            } 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 mb-4">
                      {profile?.phone && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Phone</p>
                          <p className="font-medium">{profile.phone}</p>
                        </div>
                      )}

                      {profile?.vehicleType && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Vehicle Type</p>
                          <p className="font-medium capitalize">{profile.vehicleType}</p>
                        </div>
                      )}

                      {profile?.availability && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Availability</p>
                          <p className="font-medium">{profile.availability}</p>
                        </div>
                      )}

                      {profile?.equipment && profile.equipment.length > 0 && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Equipment</p>
                          <p className="font-medium">{profile.equipment.join(', ')}</p>
                        </div>
                      )}
                    </div>

                    {profile?.rejectionReason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                        <p className="text-xs text-red-500 mb-1">Rejection Reason</p>
                        <p className="text-sm text-red-900">{profile.rejectionReason}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {profile?.status === 'pending' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(courier.id)}
                          disabled={processing === courier.id}
                          className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all disabled:opacity-50"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleReject(courier.id)}
                          disabled={processing === courier.id}
                          className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
                        >
                          ❌ Reject
                        </button>
                      </div>
                    )}

                    {profile?.approvedAt && (
                      <div className="text-xs text-gray-500 mt-3">
                        Approved on {profile.approvedAt.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Reject Courier Application</h2>
            
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                ⚠️ This will reject the courier application. They will be notified.
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
                  setRejectingCourierId(null)
                  setRejectionReason('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectingCourierId) {
                    handleReject(rejectingCourierId, rejectionReason)
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

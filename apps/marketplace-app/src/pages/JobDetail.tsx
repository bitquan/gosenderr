import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doc, updateDoc, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { formatCurrency, formatDate } from '../lib/utils'
import RateDeliveryModal from '../components/RateDeliveryModal'
import DisputeModal from '../components/DisputeModal'

interface Job {
  id: string
  status: string
  pickupAddress?: string
  deliveryAddress?: string
  pickupLat?: number
  pickupLng?: number
  deliveryLat?: number
  deliveryLng?: number
  agreedFee?: number
  createdAt: any
  acceptedAt?: any
  completedAt?: any
  courierUid?: string
  description?: string
  vehicleType?: string
  notes?: string
  recipientName?: string
  recipientPhone?: string
  createdByUid?: string
}

interface TimelineStep {
  label: string
  status: 'completed' | 'current' | 'pending'
  timestamp?: string
  icon: string
}

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { user } = useAuth()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [showDisputeModal, setShowDisputeModal] = useState(false)

  useEffect(() => {
    if (!jobId) return

    // Real-time subscription to job updates
    const unsubscribe = onSnapshot(
      doc(db, 'jobs', jobId),
      (snapshot) => {
        if (snapshot.exists()) {
          setJob({ id: snapshot.id, ...snapshot.data() } as Job)
        } else {
          setJob(null)
        }
        setLoading(false)
      },
      (error) => {
        console.error('Error loading job:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [jobId])

  const handleCancelJob = async () => {
    if (!job || !jobId) return
    if (!window.confirm('Are you sure you want to cancel this delivery?')) return

    setCancelling(true)
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        status: 'cancelled',
        cancelledAt: new Date()
      })
    } catch (error) {
      console.error('Error cancelling job:', error)
      alert('Failed to cancel delivery. Please try again.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-purple-200 rounded-full mx-auto mb-4"></div>
          <div className="h-4 bg-purple-200 rounded w-32 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <Card variant="elevated" className="max-w-md mx-auto m-6">
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Delivery Not Found</h2>
            <p className="text-gray-600 mb-6">
              We couldn't find this delivery. It may have been deleted or you don't have access to it.
            </p>
            <Link
              to="/jobs"
              className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Back to My Deliveries
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if user owns this job
  if (job.createdByUid !== user?.uid) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <Card variant="elevated" className="max-w-md mx-auto m-6">
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to view this delivery.
            </p>
            <Link
              to="/jobs"
              className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Back to My Deliveries
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Build timeline
  const timelineSteps: TimelineStep[] = [
    {
      label: 'Order Created',
      status: 'completed',
      timestamp: job.createdAt?.toDate ? formatDate(job.createdAt.toDate()) : 'Just now',
      icon: '📝'
    },
    {
      label: 'Courier Assigned',
      status: job.courierUid ? 'completed' : job.status === 'cancelled' ? 'pending' : 'current',
      timestamp: job.acceptedAt?.toDate ? formatDate(job.acceptedAt.toDate()) : undefined,
      icon: '🚚'
    },
    {
      label: 'Picked Up',
      status: ['in_progress', 'completed', 'delivered'].includes(job.status) ? 'completed' : 'pending',
      icon: '📦'
    },
    {
      label: 'In Transit',
      status: ['in_progress', 'completed', 'delivered'].includes(job.status) ? 'completed' : 'pending',
      icon: '🚀'
    },
    {
      label: 'Delivered',
      status: ['completed', 'delivered'].includes(job.status) ? 'completed' : 'pending',
      timestamp: job.completedAt?.toDate ? formatDate(job.completedAt.toDate()) : undefined,
      icon: '✅'
    }
  ]

  const canCancel = ['pending', 'open'].includes(job.status)
  const googleMapsPickupUrl = job.pickupLat && job.pickupLng 
    ? `https://www.google.com/maps/search/?api=1&query=${job.pickupLat},${job.pickupLng}`
    : null
  const googleMapsDeliveryUrl = job.deliveryLat && job.deliveryLng
    ? `https://www.google.com/maps/search/?api=1&query=${job.deliveryLat},${job.deliveryLng}`
    : null

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/jobs"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors"
          >
            <span className="text-xl">←</span>
            <span className="font-medium">Back to Deliveries</span>
          </Link>
          
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Delivery Details</h1>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono text-purple-100">#{jobId?.slice(0, 8)}</span>
                <StatusBadge
                  status={
                    job.status === 'completed' || job.status === 'delivered'
                      ? 'completed'
                      : ['in_progress', 'accepted', 'assigned'].includes(job.status)
                      ? 'in_progress'
                      : job.status === 'cancelled'
                      ? 'cancelled'
                      : 'pending'
                  }
                />
              </div>
            </div>
            {job.agreedFee && (
              <div className="text-right">
                <p className="text-sm text-purple-100 mb-1">Total Fee</p>
                <p className="text-3xl font-bold">{formatCurrency(job.agreedFee)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-8 space-y-4">
        {/* Map Card */}
        <Card variant="elevated" className="animate-fade-in">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🗺️</span>
              <span>Route Map</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-100 rounded-xl overflow-hidden" style={{ height: '400px' }}>
              <div className="w-full h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <div className="text-5xl mb-3">📍</div>
                  <p className="font-medium mb-2">Map View</p>
                  <p className="text-sm">Interactive map coming soon</p>
                  <div className="flex gap-2 mt-4 justify-center">
                    {googleMapsPickupUrl && (
                      <a
                        href={googleMapsPickupUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                      >
                        View Pickup 📍
                      </a>
                    )}
                    {googleMapsDeliveryUrl && (
                      <a
                        href={googleMapsDeliveryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                      >
                        View Delivery 🎯
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card variant="elevated" className="animate-slide-up animation-delay-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📋</span>
              <span>Delivery Status</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timelineSteps.map((step, index) => (
                <div key={index} className="flex gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${
                        step.status === 'completed'
                          ? 'bg-green-100 border-2 border-green-500'
                          : step.status === 'current'
                          ? 'bg-purple-100 border-2 border-purple-500 animate-pulse'
                          : 'bg-gray-100 border-2 border-gray-300'
                      }`}
                    >
                      {step.icon}
                    </div>
                    {index < timelineSteps.length - 1 && (
                      <div
                        className={`w-0.5 h-8 ml-5 mt-1 transition-colors ${
                          step.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <p
                      className={`font-semibold ${
                        step.status === 'completed'
                          ? 'text-green-700'
                          : step.status === 'current'
                          ? 'text-purple-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    {step.timestamp && (
                      <p className="text-sm text-gray-500 mt-1">{step.timestamp}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {job.status === 'cancelled' && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-red-800 font-semibold">❌ Delivery Cancelled</p>
                <p className="text-red-600 text-sm mt-1">This delivery was cancelled and will not be completed.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card variant="elevated" className="animate-slide-up animation-delay-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📦</span>
              <span>Delivery Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Addresses */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📍</span>
                  <span className="font-semibold text-green-800">Pickup Address</span>
                </div>
                <p className="text-gray-700">{job.pickupAddress || 'Not provided'}</p>
              </div>
              
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎯</span>
                  <span className="font-semibold text-red-800">Delivery Address</span>
                </div>
                <p className="text-gray-700">{job.deliveryAddress || 'Not provided'}</p>
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid md:grid-cols-2 gap-4">
              {job.vehicleType && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Vehicle Type</p>
                  <p className="font-semibold text-gray-900 capitalize">{job.vehicleType}</p>
                </div>
              )}
              
              {job.recipientName && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Recipient Name</p>
                  <p className="font-semibold text-gray-900">{job.recipientName}</p>
                </div>
              )}
              
              {job.recipientPhone && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Recipient Phone</p>
                  <p className="font-semibold text-gray-900">{job.recipientPhone}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 mb-1">Job ID</p>
                <p className="font-mono text-sm text-gray-900">{jobId}</p>
              </div>
            </div>

            {/* Description */}
            {job.description && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-2">Description</p>
                <p className="text-gray-900">{job.description}</p>
              </div>
            )}

            {/* Notes */}
            {job.notes && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-2">Special Instructions</p>
                <p className="text-gray-900">{job.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions Card */}
        {canCancel && (
          <Card variant="elevated" className="animate-slide-up animation-delay-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Need to cancel?</h3>
                  <p className="text-sm text-gray-600">
                    You can cancel this delivery while it's still pending
                  </p>
                </div>
                <button
                  onClick={handleCancelJob}
                  disabled={cancelling}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    cancelling
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 text-white hover:bg-red-700 hover:shadow-lg hover:scale-105'
                  }`}
                >
                  {cancelling ? 'Cancelling...' : 'Cancel Delivery'}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rate Delivery Card - Show after completion */}
        {(job.status === 'completed' || job.status === 'delivered') && job.courierUid && (
          <Card variant="elevated" className="animate-slide-up animation-delay-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Rate Your Delivery</h3>
                  <p className="text-sm text-gray-600">
                    Share your experience to help us improve our service
                  </p>
                </div>
                <button
                  onClick={() => setShowRatingModal(true)}
                  className="px-6 py-3 rounded-xl font-semibold bg-yellow-500 text-white hover:bg-yellow-600 hover:shadow-lg hover:scale-105 transition-all"
                >
                  ⭐ Rate Delivery
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contact Support Card */}
        <Card variant="elevated" className="animate-slide-up animation-delay-400">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-4xl mb-3">💬</div>
              <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Have an issue with your delivery? File a dispute or contact support.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDisputeModal(true)}
                  className="px-6 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-all hover:scale-105"
                >
                  🚨 File Dispute
                </button>
                <a
                  href="mailto:support@gosenderr.com"
                  className="inline-flex px-6 py-3 rounded-xl bg-gray-100 text-gray-900 font-semibold hover:bg-gray-200 transition-all hover:scale-105"
                >
                  Contact Support
                </a>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rating Modal */}
      {job && job.courierUid && user && (
        <RateDeliveryModal
          isOpen={showRatingModal}
          onClose={() => setShowRatingModal(false)}
          jobId={jobId || ''}
          courierUid={job.courierUid}
          courierName="Courier" // You can fetch courier name from Firestore if needed
          customerUid={user.uid}
        />
      )}

      {/* Dispute Modal */}
      {job && user && (
        <DisputeModal
          isOpen={showDisputeModal}
          onClose={() => setShowDisputeModal(false)}
          jobId={jobId || ''}
          customerUid={user.uid}
          customerName={user.displayName || user.email || 'Customer'}
        />
      )}
    </div>
  )
}

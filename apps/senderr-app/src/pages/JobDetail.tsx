// @ts-nocheck
import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate, Navigate } from 'react-router-dom'
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { useAdmin } from '../hooks/useAdmin'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { formatCurrency, formatDate } from '../lib/utils'

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
  createdByUid?: string
  description?: string
  vehicleType?: string
  notes?: string
  recipientName?: string
  recipientPhone?: string
}

interface TimelineStep {
  label: string
  status: 'completed' | 'current' | 'pending'
  timestamp?: string
  icon: string
}

export default function CourierJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  // Redirect admins to admin jobs page
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin/jobs', { replace: true })
    }
  }, [isAdmin, navigate])

  useEffect(() => {
    if (!jobId) return

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

  const redirectTo = jobId ? `/jobs/${jobId}` : '/dashboard'
  return <Navigate to={redirectTo} replace />

  const handleAcceptJob = async () => {
    if (!job || !jobId || !user) return
    if (!window.confirm('Accept this delivery job?')) return

    setUpdating(true)
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        status: 'assigned',
        courierUid: user.uid,
        acceptedAt: serverTimestamp()
      })
      alert('Job accepted! You can now proceed with the delivery.')
    } catch (error) {
      console.error('Error accepting job:', error)
      alert('Failed to accept job. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleUpdateStatus = async (newStatus: string) => {
    if (!job || !jobId || !user) return
    
    const statusMessages: Record<string, string> = {
      'in_progress': 'Mark as picked up and in transit?',
      'completed': 'Mark this delivery as completed?'
    }

    if (!window.confirm(statusMessages[newStatus] || `Update status to ${newStatus}?`)) return

    setUpdating(true)
    try {
      const updateData: any = { status: newStatus }
      
      if (newStatus === 'completed') {
        updateData.completedAt = serverTimestamp()
      }

      await updateDoc(doc(db, 'jobs', jobId), updateData)
      
      if (newStatus === 'completed') {
        alert('Delivery completed! 🎉')
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      alert('Failed to update status. Please try again.')
    } finally {
      setUpdating(false)
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h2>
            <p className="text-gray-600 mb-6">This delivery job doesn't exist or has been removed.</p>
            <Link
              to="/dashboard"
              className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              Back to Dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isMyJob = job.courierUid === user?.uid
  const isAvailable = ['pending', 'open'].includes(job.status) && !job.courierUid
  const canAccept = isAvailable
  const canUpdateStatus = isMyJob && ['assigned', 'in_progress'].includes(job.status)

  // Build timeline
  const timelineSteps: TimelineStep[] = [
    {
      label: 'Job Created',
      status: 'completed',
      timestamp: job.createdAt?.toDate ? formatDate(job.createdAt.toDate()) : 'Just now',
      icon: '📝'
    },
    {
      label: 'Accepted by Courier',
      status: job.courierUid ? 'completed' : job.status === 'cancelled' ? 'pending' : 'current',
      timestamp: job.acceptedAt?.toDate ? formatDate(job.acceptedAt.toDate()) : undefined,
      icon: '✅'
    },
    {
      label: 'In Transit',
      status: ['in_progress', 'completed'].includes(job.status) ? 'completed' : 'pending',
      icon: '🚚'
    },
    {
      label: 'Delivered',
      status: job.status === 'completed' ? 'completed' : 'pending',
      timestamp: job.completedAt?.toDate ? formatDate(job.completedAt.toDate()) : undefined,
      icon: '✅'
    }
  ]

  const googleMapsPickupUrl = job.pickupLat && job.pickupLng 
    ? `https://www.google.com/maps/dir/?api=1&destination=${job.pickupLat},${job.pickupLng}`
    : null
  const googleMapsDeliveryUrl = job.deliveryLat && job.deliveryLng
    ? `https://www.google.com/maps/dir/?api=1&destination=${job.deliveryLat},${job.deliveryLng}`
    : null

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors"
          >
            <span className="text-xl">←</span>
            <span className="font-medium">Back to Dashboard</span>
          </Link>
          
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">Delivery Job</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm font-mono text-purple-100">#{jobId?.slice(0, 8)}</span>
                <StatusBadge
                  status={
                    job.status === 'completed'
                      ? 'completed'
                      : ['in_progress', 'assigned'].includes(job.status)
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
                <p className="text-sm text-purple-100 mb-1">Delivery Fee</p>
                <p className="text-3xl font-bold">{formatCurrency(job.agreedFee)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 space-y-4">
        {/* Accept Job Card */}
        {canAccept && (
          <Card variant="elevated" className="animate-fade-in bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">🚚 Available Job</h3>
                  <p className="text-gray-600">
                    Accept this job to start the delivery
                  </p>
                </div>
                <button
                  onClick={handleAcceptJob}
                  disabled={updating}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                    updating
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-xl hover:scale-105'
                  }`}
                >
                  {updating ? 'Accepting...' : 'Accept Job'}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Update Actions */}
        {canUpdateStatus && (
          <Card variant="elevated" className="animate-fade-in bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">📋 Update Delivery Status</h3>
              <div className="flex flex-wrap gap-3">
                {job.status === 'assigned' && (
                  <button
                    onClick={() => handleUpdateStatus('in_progress')}
                    disabled={updating}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                      updating
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg hover:scale-105'
                    }`}
                  >
                    📦 Picked Up - Start Delivery
                  </button>
                )}
                {job.status === 'in_progress' && (
                  <button
                    onClick={() => handleUpdateStatus('completed')}
                    disabled={updating}
                    className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                      updating
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-br from-green-500 to-green-600 text-white hover:shadow-lg hover:scale-105'
                    }`}
                  >
                    ✅ Mark as Delivered
                  </button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map Card */}
        <Card variant="elevated" className="animate-slide-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🗺️</span>
              <span>Navigation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {googleMapsPickupUrl && (
                <a
                  href={googleMapsPickupUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 transition-colors"
                >
                  <div className="text-3xl">📍</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Navigate to Pickup</p>
                    <p className="text-sm text-gray-600">{job.pickupAddress}</p>
                  </div>
                  <span className="text-green-600 font-semibold">Open Maps →</span>
                </a>
              )}
              
              {googleMapsDeliveryUrl && (
                <a
                  href={googleMapsDeliveryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                >
                  <div className="text-3xl">🎯</div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">Navigate to Delivery</p>
                    <p className="text-sm text-gray-600">{job.deliveryAddress}</p>
                  </div>
                  <span className="text-red-600 font-semibold">Open Maps →</span>
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Timeline Card */}
        <Card variant="elevated" className="animate-slide-up animation-delay-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📋</span>
              <span>Delivery Progress</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timelineSteps.map((step, index) => (
                <div key={index} className="flex gap-4">
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
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card variant="elevated" className="animate-slide-up animation-delay-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📦</span>
              <span>Job Details</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Addresses */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">📍</span>
                  <span className="font-semibold text-green-800">Pickup</span>
                </div>
                <p className="text-gray-700 text-sm">{job.pickupAddress || 'Not provided'}</p>
              </div>
              
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎯</span>
                  <span className="font-semibold text-red-800">Delivery</span>
                </div>
                <p className="text-gray-700 text-sm">{job.deliveryAddress || 'Not provided'}</p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="grid md:grid-cols-2 gap-4">
              {job.vehicleType && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Vehicle Type</p>
                  <p className="font-semibold text-gray-900 capitalize">{job.vehicleType}</p>
                </div>
              )}
              
              {job.recipientName && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Recipient</p>
                  <p className="font-semibold text-gray-900">{job.recipientName}</p>
                </div>
              )}
              
              {job.recipientPhone && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Contact</p>
                  <a href={`tel:${job.recipientPhone}`} className="font-semibold text-purple-600 hover:text-purple-700">
                    {job.recipientPhone}
                  </a>
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
                <p className="text-sm text-gray-500 mb-2">Package Description</p>
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
      </div>
    </div>
  )
}

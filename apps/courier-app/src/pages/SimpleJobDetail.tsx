import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'

interface Job {
  id: string
  status: string
  pickupAddress?: string
  deliveryAddress?: string
  agreedFee?: number
  createdAt: any
  courierUid?: string
  pickup?: { label?: string; lat: number; lng: number }
  dropoff?: { label?: string; lat: number; lng: number }
}

export default function SimpleJobDetail() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (!jobId || !db) {
      setLoading(false)
      return
    }

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
        console.error('Error fetching job:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [jobId])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'assigned':
        return 'bg-blue-100 text-blue-800'
      case 'in_progress':
        return 'bg-green-100 text-green-800'
      case 'completed':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleAcceptJobFromDetail = async () => {
    if (!jobId || !user?.uid || updating) return

    setUpdating(true)
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        courierUid: user.uid,
        status: 'assigned',
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      // Status will update via the snapshot listener
    } catch (error) {
      console.error('Error accepting job:', error)
      alert('Failed to accept job. It may have been claimed by another courier.')
    } finally {
      setUpdating(false)
    }
  }

  const handleStartDelivery = async () => {
    if (!jobId || updating) return

    setUpdating(true)
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        status: 'in_progress',
        updatedAt: new Date(),
      })
      // Status will update via the snapshot listener
    } catch (error) {
      console.error('Error starting delivery:', error)
      alert('Failed to start delivery')
    } finally {
      setUpdating(false)
    }
  }

  const handleMarkCompleted = async () => {
    if (!jobId || updating) return

    setUpdating(true)
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      // Wait a moment for the update to be reflected
      await new Promise(resolve => setTimeout(resolve, 500))
      navigate('/dashboard')
    } catch (error) {
      console.error('Error completing job:', error)
      alert('Failed to complete job')
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleString()
  }

  const getAddress = (job: Job, type: 'pickup' | 'delivery') => {
    if (type === 'pickup') {
      return job.pickupAddress || job.pickup?.label || 'No pickup address'
    }
    return job.deliveryAddress || job.dropoff?.label || 'No delivery address'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-gray-700 mb-4">Job not found</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Check if this job belongs to the current courier (only for assigned jobs)
  const isAssignedToCurrentCourier = job.courierUid === user?.uid
  const isUnassigned = !job.courierUid && (job.status === 'open' || job.status === 'pending')

  if (!isAssignedToCurrentCourier && !isUnassigned) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-gray-700 mb-4">Access Denied</p>
          <p className="text-gray-600 mb-4">This job is assigned to another courier</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-purple-600 hover:text-purple-700 mb-2 flex items-center"
          >
            <span className="mr-2">←</span> Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Job Details</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Status Badge */}
          <div className="mb-6">
            <span className={`inline-block px-4 py-2 text-sm font-semibold rounded-full ${getStatusColor(job.status)}`}>
              Status: {job.status.replace(/_/g, ' ').toUpperCase()}
            </span>
          </div>

          {/* Job Information */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">
                📍 Pickup Address
              </label>
              <p className="text-lg text-gray-900">{getAddress(job, 'pickup')}</p>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">
                🎯 Delivery Address
              </label>
              <p className="text-lg text-gray-900">{getAddress(job, 'delivery')}</p>
            </div>

            {job.agreedFee && (
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">
                  💰 Agreed Fee
                </label>
                <p className="text-2xl font-bold text-green-600">
                  ${job.agreedFee.toFixed(2)}
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">
                📅 Created
              </label>
              <p className="text-gray-900">{formatDate(job.createdAt)}</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            {(job.status === 'open' || job.status === 'pending') && isUnassigned && (
              <button
                onClick={handleAcceptJobFromDetail}
                disabled={updating}
                className={`w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors ${
                  updating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {updating ? 'Accepting...' : '✅ Accept Job'}
              </button>
            )}

            {job.status === 'assigned' && isAssignedToCurrentCourier && (
              <button
                onClick={handleStartDelivery}
                disabled={updating}
                className={`w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors ${
                  updating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {updating ? 'Starting...' : '🚚 Start Delivery'}
              </button>
            )}

            {job.status === 'in_progress' && isAssignedToCurrentCourier && (
              <button
                onClick={handleMarkCompleted}
                disabled={updating}
                className={`w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors ${
                  updating ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {updating ? 'Completing...' : '✅ Mark as Completed'}
              </button>
            )}

            {job.status === 'completed' && (
              <div className="text-center py-4">
                <p className="text-lg font-semibold text-green-600 mb-4">
                  ✅ Job Completed!
                </p>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
                >
                  Back to Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

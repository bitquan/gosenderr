import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
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

export default function SimpleDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [availableJobs, setAvailableJobs] = useState<Job[]>([])
  const [activeJobs, setActiveJobs] = useState<Job[]>([])
  const [isOnline, setIsOnline] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Listen to available jobs (open or pending status, no courier assigned)
  useEffect(() => {
    if (!db) {
      console.error('Firebase not initialized')
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'jobs'),
      where('status', 'in', ['open', 'pending'])
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Job[]
      // Filter out jobs that already have a courier assigned
      const unassignedJobs = jobs.filter((job) => !job.courierUid)
      setAvailableJobs(unassignedJobs)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Listen to courier's active jobs
  useEffect(() => {
    if (!user?.uid || !db) return

    const q = query(
      collection(db, 'jobs'),
      where('courierUid', '==', user.uid)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const jobs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Job[]
      // Filter out completed and cancelled jobs
      const active = jobs.filter(
        (job) => job.status !== 'completed' && job.status !== 'cancelled'
      )
      setActiveJobs(active)
    })

    return () => unsubscribe()
  }, [user])

  // Get courier's online status
  useEffect(() => {
    if (!user?.uid || !db) return

    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      const data = snapshot.data()
      setIsOnline(data?.courierProfile?.online || false)
    })

    return () => unsubscribe()
  }, [user])

  const handleToggleOnline = async () => {
    if (!user?.uid || updatingStatus) return

    setUpdatingStatus(true)
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        'courierProfile.online': !isOnline,
      })
    } catch (error) {
      console.error('Error updating online status:', error)
      alert('Failed to update online status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAcceptJob = async (jobId: string) => {
    if (!user?.uid) return

    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        courierUid: user.uid,
        status: 'assigned',
        acceptedAt: new Date(),
        updatedAt: new Date(),
      })
      navigate(`/jobs/${jobId}`)
    } catch (error) {
      console.error('Error accepting job:', error)
      alert('Failed to accept job. It may have been claimed by another courier.')
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
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Courier Dashboard</h1>
            <button
              onClick={handleToggleOnline}
              disabled={updatingStatus}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                isOnline
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {updatingStatus ? 'Updating...' : isOnline ? 'Online' : 'Offline'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Active Jobs Section */}
        {activeJobs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Your Active Jobs</h2>
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-blue-50 border-2 border-blue-300 rounded-lg p-6 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/jobs/${job.id}`)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-block px-3 py-1 bg-blue-600 text-white text-sm font-semibold rounded-full">
                      ACTIVE
                    </span>
                    <span className="text-sm text-gray-600">
                      Status: {job.status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-semibold text-gray-700">Pickup:</span>
                      <p className="text-gray-900">{getAddress(job, 'pickup')}</p>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-700">Delivery:</span>
                      <p className="text-gray-900">{getAddress(job, 'delivery')}</p>
                    </div>
                    {job.agreedFee && (
                      <div>
                        <span className="text-sm font-semibold text-gray-700">Fee:</span>
                        <p className="text-gray-900">${job.agreedFee.toFixed(2)}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Jobs Section */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Available Jobs ({availableJobs.length})
          </h2>
          {availableJobs.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <p className="text-gray-500 text-lg">No available jobs at the moment</p>
              <p className="text-gray-400 text-sm mt-2">
                {isOnline ? 'Check back soon!' : 'Go online to see available jobs'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white rounded-lg p-6 shadow hover:shadow-md transition-shadow"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500">
                        Posted: {formatDate(job.createdAt)}
                      </span>
                      {job.agreedFee && (
                        <span className="text-lg font-bold text-green-600">
                          ${job.agreedFee.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <span className="text-sm font-semibold text-gray-700">📍 Pickup:</span>
                        <p className="text-gray-900 ml-6">{getAddress(job, 'pickup')}</p>
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-gray-700">🎯 Delivery:</span>
                        <p className="text-gray-900 ml-6">{getAddress(job, 'delivery')}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      className="w-full mt-4 bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                    >
                      Accept Job
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

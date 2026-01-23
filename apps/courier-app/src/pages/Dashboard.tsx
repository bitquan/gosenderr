import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { formatCurrency, formatDate } from '../lib/utils'
import { useNavigate } from 'react-router-dom'

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
  description?: string
  vehicleType?: string
}

interface CourierProfile {
  online: boolean
  vehicleType?: string
  currentLocation?: { lat: number; lng: number }
}

export default function CourierDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [isOnline, setIsOnline] = useState(false)
  const [profile, setProfile] = useState<CourierProfile | null>(null)
  const [availableJobs, setAvailableJobs] = useState<Job[]>([])
  const [myActiveJobs, setMyActiveJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Load courier profile
  useEffect(() => {
    if (!user) return

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data()
          setProfile({
            online: data.courierProfile?.online || false,
            vehicleType: data.courierProfile?.vehicleType,
            currentLocation: data.location
          })
          setIsOnline(data.courierProfile?.online || false)
        }
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  // Load available jobs (open jobs not assigned)
  useEffect(() => {
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('status', '==', 'open')
    )

    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[]
      setAvailableJobs(jobs)
    })

    return () => unsubscribe()
  }, [])

  // Load my active jobs
  useEffect(() => {
    if (!user) return

    const jobsQuery = query(
      collection(db, 'jobs'),
      where('courierUid', '==', user.uid),
      where('status', 'in', ['assigned', 'in_progress', 'accepted'])
    )

    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      const jobs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[]
      setMyActiveJobs(jobs)
    })

    return () => unsubscribe()
  }, [user])

  const handleToggleOnline = async () => {
    if (!user || updatingStatus) return

    setUpdatingStatus(true)
    try {
      const newStatus = !isOnline
      await updateDoc(doc(db, 'users', user.uid), {
        'courierProfile.online': newStatus,
        'courierProfile.lastOnlineAt': new Date()
      })
      setIsOnline(newStatus)
    } catch (error) {
      console.error('Error updating online status:', error)
      alert('Failed to update status')
    } finally {
      setUpdatingStatus(false)
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

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      {/* Purple Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6 gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <Avatar
                fallback={user?.displayName || user?.email || 'Courier'}
                size="lg"
                className="flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold">
                  Courier Dashboard
                </h1>
                <p className="text-purple-100 text-xs sm:text-sm truncate">{user?.email}</p>
              </div>
            </div>
            
            {/* Online Toggle */}
            <button
              onClick={handleToggleOnline}
              disabled={updatingStatus}
              className={`px-6 py-3 rounded-full font-semibold text-lg transition-all duration-300 flex items-center gap-2 ${
                isOnline
                  ? 'bg-green-500 hover:bg-green-600 shadow-lg hover:shadow-xl hover:scale-105'
                  : 'bg-gray-400 hover:bg-gray-500'
              } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-white animate-pulse' : 'bg-gray-200'}`} />
              {updatingStatus ? 'Updating...' : isOnline ? 'Online' : 'Offline'}
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2 sm:p-3">
              <p className="text-xs sm:text-sm text-purple-100 mb-1">Available</p>
              <p className="text-xl sm:text-2xl font-bold">{availableJobs.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2 sm:p-3">
              <p className="text-xs sm:text-sm text-purple-100 mb-1">Active</p>
              <p className="text-xl sm:text-2xl font-bold">{myActiveJobs.length}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2 sm:p-3">
              <p className="text-xs sm:text-sm text-purple-100 mb-1">Vehicle</p>
              <p className="text-sm sm:text-base font-bold capitalize">{profile?.vehicleType || 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 space-y-4">
        {!isOnline && (
          <Card variant="elevated" className="animate-fade-in bg-yellow-50 border-yellow-200">
            <CardContent className="p-6 text-center">
              <div className="text-5xl mb-3">⚠️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">You're Offline</h3>
              <p className="text-gray-600 mb-4">
                Turn on your online status to see available delivery jobs
              </p>
              <button
                onClick={handleToggleOnline}
                disabled={updatingStatus}
                className="px-6 py-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 text-white font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Go Online
              </button>
            </CardContent>
          </Card>
        )}

        {/* My Active Jobs */}
        {myActiveJobs.length > 0 && (
          <Card variant="elevated" className="animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>🚚</span>
                <span>My Active Deliveries ({myActiveJobs.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myActiveJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                    className="p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <span className="text-sm font-mono text-gray-500">#{job.id.slice(0, 8)}</span>
                        <StatusBadge
                          status={job.status === 'in_progress' ? 'in_progress' : 'active'}
                          className="ml-2"
                        />
                      </div>
                      {job.agreedFee && (
                        <p className="text-xl font-bold text-green-600">
                          {formatCurrency(job.agreedFee)}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 text-sm">
                      <p>📍 <strong>Pickup:</strong> {job.pickupAddress}</p>
                      <p>🎯 <strong>Delivery:</strong> {job.deliveryAddress}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Jobs */}
        <Card variant="elevated" className="animate-slide-up animation-delay-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>📦</span>
              <span>Available Jobs ({availableJobs.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableJobs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-lg mb-2">No jobs available</p>
                <p className="text-sm">Check back soon for new delivery opportunities</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {availableJobs.map((job, index) => (
                  <Card
                    key={job.id}
                    variant="elevated"
                    className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => navigate(`/jobs/${job.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-mono text-gray-500">#{job.id.slice(0, 8)}</span>
                            <StatusBadge status="pending" />
                          </div>
                        </div>
                        {job.agreedFee && (
                          <div className="text-right">
                            <p className="text-2xl font-bold text-purple-600">
                              {formatCurrency(job.agreedFee)}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-3">
                        {/* Pickup */}
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-xl">
                            📍
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-1">Pickup</p>
                            <p className="font-medium text-gray-900 text-sm break-words">
                              {job.pickupAddress || 'Address not provided'}
                            </p>
                          </div>
                        </div>

                        {/* Delivery */}
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-xl">
                            🎯
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-1">Delivery</p>
                            <p className="font-medium text-gray-900 text-sm break-words">
                              {job.deliveryAddress || 'Address not provided'}
                            </p>
                          </div>
                        </div>

                        {/* Description */}
                        {job.description && (
                          <div className="pt-3 border-t border-gray-100">
                            <p className="text-sm text-gray-600 line-clamp-2">
                              📦 {job.description}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                        <div className="text-sm text-gray-500">
                          {job.createdAt?.toDate ? formatDate(job.createdAt.toDate()) : 'Recently'}
                        </div>
                        <button className="px-4 py-2 rounded-lg bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white font-semibold hover:shadow-lg hover:scale-105 transition-all">
                          Accept Job →
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

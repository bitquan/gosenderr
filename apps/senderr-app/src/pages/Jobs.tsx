import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
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
  agreedFee?: number
  createdAt: any
  acceptedAt?: any
  completedAt?: any
  description?: string
  pricing?: {
    courierRate?: number
    totalAmount?: number
  }
}

export default function CourierJobsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isAdmin } = useAdmin()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')

  // Redirect admins to admin jobs page
  useEffect(() => {
    if (isAdmin) {
      navigate('/admin/jobs', { replace: true })
    }
  }, [isAdmin, navigate])

  useEffect(() => {
    if (!user) return

    setLoading(true)

    const jobsRef = collection(db, 'jobs')
    const primaryQuery = query(jobsRef, where('courierUid', '==', user.uid))
    const legacyQuery = query(jobsRef, where('courierId', '==', user.uid))

    const mergeJobs = (lists: Job[][]) => {
      const map = new Map<string, Job>()
      lists.flat().forEach((job) => {
        map.set(job.id, job)
      })
      const merged = Array.from(map.values())
      merged.sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() ?? a.completedAt?.toDate?.() ?? new Date(0)
        const bDate = b.createdAt?.toDate?.() ?? b.completedAt?.toDate?.() ?? new Date(0)
        return bDate.getTime() - aDate.getTime()
      })
      return merged
    }

    let primaryJobs: Job[] = []
    let legacyJobs: Job[] = []

    const updateState = () => {
      setJobs(mergeJobs([primaryJobs, legacyJobs]))
      setLoading(false)
    }

    const unsubPrimary = onSnapshot(
      primaryQuery,
      (snapshot) => {
        primaryJobs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Job[]
        updateState()
      },
      (error) => {
        console.error('Error loading jobs:', error)
        setLoading(false)
      }
    )

    const unsubLegacy = onSnapshot(
      legacyQuery,
      (snapshot) => {
        legacyJobs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Job[]
        updateState()
      },
      (error) => {
        console.error('Error loading legacy jobs:', error)
        setLoading(false)
      }
    )

    return () => {
      unsubPrimary()
      unsubLegacy()
    }
  }, [user])

  const activeStatuses = new Set([
    'assigned',
    'accepted',
    'in_progress',
    'enroute_pickup',
    'arrived_pickup',
    'picked_up',
    'enroute_dropoff',
    'arrived_dropoff',
  ])

  const completedStatuses = new Set(['completed', 'delivered'])

  const filteredJobs = jobs.filter(job => {
    if (filter === 'all') return true
    if (filter === 'active') return activeStatuses.has(job.status)
    if (filter === 'completed') return completedStatuses.has(job.status)
    return true
  })

  const totalEarnings = jobs
    .filter(job => completedStatuses.has(job.status))
    .reduce((sum, job) => sum + (job.agreedFee || job.pricing?.courierRate || job.pricing?.totalAmount || 0), 0)

  const completedCount = jobs.filter(job => completedStatuses.has(job.status)).length
  const activeCount = jobs.filter(job => activeStatuses.has(job.status)).length

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
          
          <h1 className="text-3xl font-bold mb-6">My Deliveries</h1>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <p className="text-purple-100 text-xs mb-1">Total Earned</p>
              <p className="text-2xl sm:text-3xl font-bold">{formatCurrency(totalEarnings)}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <p className="text-purple-100 text-xs mb-1">Completed</p>
              <p className="text-2xl sm:text-3xl font-bold">{completedCount}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
              <p className="text-purple-100 text-xs mb-1">Active</p>
              <p className="text-2xl sm:text-3xl font-bold">{activeCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6">
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              filter === 'all'
                ? 'bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            All ({jobs.length})
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              filter === 'active'
                ? 'bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Active ({activeCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              filter === 'completed'
                ? 'bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>
      </div>

      {/* Jobs List */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 mt-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} variant="elevated" className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No deliveries found</h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' 
                  ? "You haven't accepted any jobs yet"
                  : filter === 'active'
                  ? "You don't have any active deliveries"
                  : "You haven't completed any deliveries yet"}
              </p>
              <Link
                to="/dashboard"
                className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Browse Available Jobs
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job, index) => (
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
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-sm font-mono text-gray-500">#{job.id.slice(0, 8)}</span>
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
                      {job.completedAt?.toDate && (
                        <p className="text-xs text-gray-500">
                          Delivered {formatDate(job.completedAt.toDate())}
                        </p>
                      )}
                      {job.acceptedAt?.toDate && !job.completedAt && (
                        <p className="text-xs text-gray-500">
                          Accepted {formatDate(job.acceptedAt.toDate())}
                        </p>
                      )}
                    </div>
                    {job.agreedFee && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500 mb-1">Fee</p>
                        <p className={`text-2xl font-bold ${
                          job.status === 'completed' ? 'text-green-600' : 'text-purple-600'
                        }`}>
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

                  {/* View Details Arrow */}
                  <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                    <span className="text-purple-600 font-semibold text-sm flex items-center gap-1">
                      View Details
                      <span className="text-lg">→</span>
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

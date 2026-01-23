import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { formatCurrency, formatDate } from '../lib/utils'
import { Link, useNavigate } from 'react-router-dom'

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
}

export default function JobsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!user) return

    const jobsQuery = query(
      collection(db, 'jobs'),
      where('createdByUid', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      jobsQuery,
      (snapshot) => {
        const jobsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Job[]
        setJobs(jobsData)
        setLoading(false)
      },
      (error) => {
        console.error('Error loading jobs:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user])

  const filteredJobs = jobs.filter(job => {
    // Filter by tab
    let tabMatch = true
    if (activeTab === 'active') {
      tabMatch = ['pending', 'accepted', 'in_progress', 'ready_for_pickup', 'assigned'].includes(job.status)
    } else if (activeTab === 'completed') {
      tabMatch = ['completed', 'delivered'].includes(job.status)
    }

    // Filter by search
    let searchMatch = true
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      searchMatch = 
        job.pickupAddress?.toLowerCase().includes(query) ||
        job.deliveryAddress?.toLowerCase().includes(query) ||
        job.description?.toLowerCase().includes(query) ||
        job.id.toLowerCase().includes(query) ||
        false
    }

    return tabMatch && searchMatch
  })

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

  const activeCount = jobs.filter(j => ['pending', 'accepted', 'in_progress', 'ready_for_pickup', 'assigned'].includes(j.status)).length
  const completedCount = jobs.filter(j => ['completed', 'delivered'].includes(j.status)).length

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      {/* Purple Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Avatar
                fallback={user?.displayName || user?.email || 'User'}
                size="lg"
              />
              <div>
                <h1 className="text-2xl font-bold">My Deliveries</h1>
                <p className="text-purple-100 text-sm">
                  {jobs.length} total • {activeCount} active • {completedCount} completed
                </p>
              </div>
            </div>
            <Link
              to="/request-delivery"
              className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-sm text-white font-semibold hover:bg-white/30 transition-all hover:scale-105"
            >
              + New Delivery
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-8 space-y-4">
        {/* Search and Filters */}
        <Card variant="elevated" className="animate-fade-in">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search Bar */}
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search by address, description, or job ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none transition-all"
                />
              </div>
              
              {/* Tab Filters */}
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                    activeTab === 'all'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All ({jobs.length})
                </button>
                <button
                  onClick={() => setActiveTab('active')}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                    activeTab === 'active'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Active ({activeCount})
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`px-4 py-2 rounded-md font-medium text-sm transition-all ${
                    activeTab === 'completed'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Done ({completedCount})
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jobs Grid */}
        {filteredJobs.length === 0 ? (
          <Card variant="elevated" className="animate-slide-up">
            <CardContent>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">
                  {searchQuery ? '🔍' : activeTab === 'active' ? '📦' : activeTab === 'completed' ? '✅' : '🚚'}
                </div>
                <p className="text-gray-600 text-lg mb-2">
                  {searchQuery 
                    ? 'No jobs found matching your search'
                    : activeTab === 'active' 
                    ? 'No active deliveries'
                    : activeTab === 'completed'
                    ? 'No completed deliveries yet'
                    : 'No deliveries yet'}
                </p>
                <p className="text-gray-500 text-sm mb-6">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Create your first delivery request to get started'}
                </p>
                {!searchQuery && (
                  <Link
                    to="/request-delivery"
                    className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white font-semibold hover:shadow-xl hover:scale-105 transition-all duration-300"
                  >
                    Request your first delivery →
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
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
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-mono text-gray-500">#{job.id.slice(0, 8)}</span>
                        <StatusBadge
                          status={
                            job.status === 'completed' || job.status === 'delivered'
                              ? 'completed'
                              : ['in_progress', 'accepted', 'assigned'].includes(job.status)
                              ? 'in_progress'
                              : 'pending'
                          }
                        />
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
                        <p className="font-medium text-gray-900 truncate">
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
                        <p className="font-medium text-gray-900 truncate">
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
                    <button className="text-sm font-semibold text-purple-600 hover:text-purple-700">
                      View Details →
                    </button>
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

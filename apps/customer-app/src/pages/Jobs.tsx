import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { formatCurrency, formatDate } from '../lib/utils'
import { Link } from 'react-router-dom'

interface Job {
  id: string
  status: string
  pickupAddress?: string
  deliveryAddress?: string
  pickupLocation?: { lat: number; lng: number }
  deliveryLocation?: { lat: number; lng: number }
  agreedFee?: number
  createdAt: any
  acceptedAt?: any
  completedAt?: any
  courierUid?: string
  description?: string
}

export default function JobsPage() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all')

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
    if (activeTab === 'active') {
      return ['pending', 'accepted', 'in_progress', 'ready_for_pickup'].includes(job.status)
    }
    if (activeTab === 'completed') {
      return ['completed', 'cancelled'].includes(job.status)
    }
    return true
  })

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Deliveries</h1>
          <p className="text-gray-600 mt-1">{jobs.length} total deliveries</p>
        </div>
        <Link
          to="/request-delivery"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          + New Delivery
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'all'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          All ({jobs.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'active'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          Active ({jobs.filter(j => ['pending', 'accepted', 'in_progress', 'ready_for_pickup'].includes(j.status)).length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'completed'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          History ({jobs.filter(j => ['completed', 'cancelled'].includes(j.status)).length})
        </button>
      </div>

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <p className="text-gray-600 text-lg mb-4">
              {activeTab === 'all' && 'No deliveries yet'}
              {activeTab === 'active' && 'No active deliveries'}
              {activeTab === 'completed' && 'No completed deliveries'}
            </p>
            {activeTab === 'all' && (
              <Link
                to="/request-delivery"
                className="inline-flex items-center justify-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                Request Your First Delivery
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map(job => (
            <Card key={job.id} hover>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        Delivery #{job.id.slice(0, 8)}
                      </h3>
                      <StatusBadge status={job.status as any} />
                    </div>
                    {job.description && (
                      <p className="text-sm text-gray-600 mb-3">{job.description}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(job.agreedFee || 0)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {job.createdAt && formatDate(job.createdAt.toDate())}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-600 text-xs">📍</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Pickup</p>
                      <p className="text-sm text-gray-600">
                        {job.pickupAddress || 'Address not set'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-blue-600 text-xs">📍</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-700">Delivery</p>
                      <p className="text-sm text-gray-600">
                        {job.deliveryAddress || 'Address not set'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    {job.status === 'pending' && 'Waiting for courier'}
                    {job.status === 'accepted' && 'Courier assigned'}
                    {job.status === 'in_progress' && 'In transit'}
                    {job.status === 'completed' && 'Delivered'}
                    {job.status === 'cancelled' && 'Cancelled'}
                  </div>
                  <button className="text-sm font-medium text-primary-600 hover:text-primary-700">
                    View Details →
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}


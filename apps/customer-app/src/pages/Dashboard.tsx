import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { StatCard } from '../components/StatCard'
import { StatusBadge } from '../components/Badge'
import { formatCurrency, formatDate } from '../lib/utils'
import { Link } from 'react-router-dom'

interface Job {
  id: string
  status: string
  pickupAddress?: string
  deliveryAddress?: string
  agreedFee?: number
  createdAt: any
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadDashboardData()
    }
  }, [user])

  const loadDashboardData = async () => {
    try {
      // Load jobs
      const jobsQuery = query(
        collection(db, 'jobs'),
        where('createdByUid', '==', user!.uid),
        orderBy('createdAt', 'desc'),
        limit(5)
      )
      const jobsSnapshot = await getDocs(jobsQuery)
      const jobsData = jobsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[]
      setJobs(jobsData)
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalSpent = jobs.reduce((sum, job) => sum + (job.agreedFee || 0), 0)
  const activeJobs = jobs.filter(j => ['pending', 'active', 'in_progress'].includes(j.status)).length
  const completedJobs = jobs.filter(j => j.status === 'completed').length

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
          <div className="h-24 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your delivery overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Active Deliveries"
          value={activeJobs}
          variant="primary"
          icon="🚚"
        />
        <StatCard
          title="Completed"
          value={completedJobs}
          variant="success"
          icon="✅"
        />
        <StatCard
          title="Total Spent"
          value={formatCurrency(totalSpent)}
          variant="default"
          icon="💰"
        />
      </div>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
          <Link
            to="/jobs"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View All →
          </Link>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No deliveries yet</p>
              <Link
                to="/request-delivery"
                className="inline-flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Request Your First Delivery
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map(job => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-medium text-gray-900">
                        {job.pickupAddress?.slice(0, 30)}...
                      </span>
                      <StatusBadge status={job.status as any} />
                    </div>
                    <p className="text-sm text-gray-500">
                      To: {job.deliveryAddress?.slice(0, 30)}...
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(job.agreedFee || 0)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {job.createdAt && formatDate(job.createdAt.toDate())}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link to="/request-delivery">
          <Card hover className="h-full">
            <CardContent className="flex items-center gap-4">
              <div className="text-4xl">📦</div>
              <div>
                <h3 className="font-semibold text-gray-900">Request Delivery</h3>
                <p className="text-sm text-gray-500">Send a package or document</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link to="/jobs">
          <Card hover className="h-full">
            <CardContent className="flex items-center gap-4">
              <div className="text-4xl">📋</div>
              <div>
                <h3 className="font-semibold text-gray-900">Track Deliveries</h3>
                <p className="text-sm text-gray-500">View all your deliveries</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}


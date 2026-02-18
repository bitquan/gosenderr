import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { formatCurrency, formatDate } from '../lib/utils'

interface Job {
  id: string
  status: string
  pickupAddress?: string
  deliveryAddress?: string
  agreedFee?: number
  createdAt?: any
  courierUid?: string
  createdByUid?: string
  createdByEmail?: string
}

export default function AdminJobsPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'completed'>('all')

  useEffect(() => {
    loadJobs()
  }, [])

  const loadJobs = async () => {
    try {
      const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'))
      const snapshot = await getDocs(q)
      const jobsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Job[]
      setJobs(jobsData)
    } catch (error) {
      console.error('Error loading jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs = jobs.filter(job => {
    if (filter === 'all') return true
    if (filter === 'pending') return job.status === 'pending' && !job.courierUid
    if (filter === 'active') return ['assigned', 'in_progress'].includes(job.status)
    if (filter === 'completed') return job.status === 'completed'
    return true
  })

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">📦 Job Management</h1>
          <p className="text-purple-100">{jobs.length} total jobs</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 flex-wrap">
          {(['all', 'pending', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all capitalize ${
                filter === f
                  ? 'bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Jobs List */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <Card
                key={job.id}
                variant="elevated"
                className="hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                onClick={() => navigate(`/admin/jobs/${job.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
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
                      <p className="text-xs text-gray-500">
                        {job.createdAt?.toDate ? formatDate(job.createdAt.toDate()) : 'Just now'}
                      </p>
                    </div>
                    {job.agreedFee && (
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(job.agreedFee)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex gap-3">
                      <span className="text-lg">📍</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Pickup</p>
                        <p className="text-sm font-medium text-gray-900">{job.pickupAddress || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-lg">🎯</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Delivery</p>
                        <p className="text-sm font-medium text-gray-900">{job.deliveryAddress || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Customer: {job.createdByEmail || job.createdByUid}</span>
                    {job.courierUid && <span>Courier: {job.courierUid.slice(0, 8)}</span>}
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

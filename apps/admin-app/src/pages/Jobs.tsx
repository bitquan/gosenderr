import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { collection, getDocs, orderBy, query, where, doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { formatCurrency, formatDate } from '../lib/utils'
import { getFunctions, httpsCallable } from 'firebase/functions'

interface Job {
  id: string
  status: string
  pickupAddress?: string
  deliveryAddress?: string
  agreedFee?: number
  createdAt?: any
  courierUid?: string
  courierName?: string
  courierEmail?: string
  createdByUid?: string
  createdByEmail?: string
  createdByName?: string
  cancelledAt?: any
  completedAt?: any
  assignedAt?: any
}

export default function AdminJobsPage() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'completed' | 'cancelled'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

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

  const handleCancelJob = async () => {
    if (!cancellingJobId || !cancelReason.trim()) return

    setProcessing(cancellingJobId)
    try {
      await updateDoc(doc(db, 'jobs', cancellingJobId), {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledBy: 'admin',
        cancelReason: cancelReason
      })
      alert('Job cancelled successfully')
      setShowCancelModal(false)
      setCancellingJobId(null)
      setCancelReason('')
      loadJobs()
    } catch (error: any) {
      console.error('Error cancelling job:', error)
      alert(`Failed to cancel job: ${error.message}`)
    } finally {
      setProcessing(null)
    }
  }

  const exportToCSV = () => {
    const headers = ['ID', 'Status', 'Customer', 'Courier', 'Pickup', 'Delivery', 'Fee', 'Created']
    const rows = filteredJobs.map(job => [
      job.id,
      job.status,
      job.createdByEmail || job.createdByUid || 'N/A',
      job.courierEmail || job.courierUid || 'Unassigned',
      job.pickupAddress || 'N/A',
      job.deliveryAddress || 'N/A',
      job.agreedFee || 0,
      job.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'
    ])
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `jobs-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  const filteredJobs = jobs
    .filter(job => {
      if (filter === 'all') return true
      if (filter === 'pending') return job.status === 'pending' && !job.courierUid
      if (filter === 'active') return ['assigned', 'in_progress'].includes(job.status)
      if (filter === 'completed') return job.status === 'completed'
      if (filter === 'cancelled') return job.status === 'cancelled'
      return true
    })
    .filter(job => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        job.id.toLowerCase().includes(q) ||
        job.pickupAddress?.toLowerCase().includes(q) ||
        job.deliveryAddress?.toLowerCase().includes(q) ||
        job.createdByEmail?.toLowerCase().includes(q) ||
        job.courierEmail?.toLowerCase().includes(q)
      )
    })
    .filter(job => {
      if (dateFilter === 'all') return true
      if (!job.createdAt?.toDate) return true
      const jobDate = job.createdAt.toDate()
      const now = new Date()
      const dayMs = 24 * 60 * 60 * 1000
      
      if (dateFilter === 'today') {
        return jobDate.toDateString() === now.toDateString()
      }
      if (dateFilter === 'week') {
        return (now.getTime() - jobDate.getTime()) < 7 * dayMs
      }
      if (dateFilter === 'month') {
        return (now.getTime() - jobDate.getTime()) < 30 * dayMs
      }
      return true
    })

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">📦 Job Management</h1>
          <p className="text-purple-100">{jobs.length} total jobs</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Search and Export */}
        <div className="bg-white rounded-2xl shadow-lg p-4 flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search by ID, address, customer, courier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={exportToCSV}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
          >
            📊 Export CSV
          </button>
        </div>

        {/* Date Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 flex-wrap">
          {(['all', 'today', 'week', 'month'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDateFilter(d)}
              className={`flex-1 py-2 px-3 rounded-xl font-medium transition-all capitalize text-sm ${
                dateFilter === d
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Status Filters */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 flex-wrap">
          {(['all', 'pending', 'active', 'completed', 'cancelled'] as const).map((f) => (
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
                onClick={() => navigate(`/jobs/${job.id}`)}
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

                  {/* Admin Actions */}
                  {!['completed', 'cancelled'].includes(job.status) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setCancellingJobId(job.id)
                          setShowCancelModal(true)
                        }}
                        disabled={processing === job.id}
                        className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        🚫 Force Cancel
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Cancel Job Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Cancel Job</h2>
            
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                ⚠️ This will immediately cancel the job. The customer should be refunded manually if needed.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cancellation Reason *
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter reason for cancellation..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowCancelModal(false)
                  setCancellingJobId(null)
                  setCancelReason('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCancelJob}
                disabled={!cancelReason.trim() || processing !== null}
                className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

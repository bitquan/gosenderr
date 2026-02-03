import { useEffect, useMemo, useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { collection, getDocs, orderBy, query, where, doc, updateDoc, limit, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { formatCurrency, formatDate } from '../lib/utils'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { exportToCSV, formatJobsForExport } from '../lib/csvExport'
import { CreateJobModal } from '../components/CreateJobModal'
import { LiveTripStatus } from '../components/v2/LiveTripStatus'

interface Job {
  id: string
  status: string
  statusDetail?: string
  pickupAddress?: string
  deliveryAddress?: string
  pickup?: { lat: number; lng: number; label?: string; address?: string }
  dropoff?: { lat: number; lng: number; label?: string; address?: string }
  pickupProof?: any
  dropoffProof?: any
  deliveryProof?: any
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
  const [searchParams] = useSearchParams()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'active' | 'completed' | 'cancelled'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [cancellingJobId, setCancellingJobId] = useState<string | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [selectedJobLoading, setSelectedJobLoading] = useState(false)
  const [selectedCourier, setSelectedCourier] = useState<any | null>(null)

  const getDisplayStatus = (job: Job) => {
    const status = getEffectiveStatus(job)
    if (['completed', 'cancelled', 'pending', 'open', 'assigned', 'in_progress'].includes(status)) {
      return status
    }
    return 'in_progress'
  }

  const getEffectiveTripStatus = (job: Job) => {
    const status = getEffectiveStatus(job)
    if (status === 'pending') return 'open'
    if (status === 'in_progress') return 'enroute_pickup'
    return status
  }

  const getEffectiveStatus = (job: Job) => job.statusDetail || job.status

  const buildProofPhoto = (proof: any) => {
    if (!proof) return undefined
    const url = proof.url || proof.photoUrl || proof.photoDataUrl
    if (!url) return undefined
    return {
      url,
      timestamp: proof.timestamp || proof.createdAt || proof.updatedAt,
      gpsVerified: Boolean(proof.location),
      accuracy: proof.accuracy,
      location: proof.location || undefined,
    }
  }

  useEffect(() => {
    const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'), limit(200))
    const unsubscribe = onSnapshot(
      q,
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
  }, [])

  useEffect(() => {
    const jobId = searchParams.get('jobId')
    if (!jobId) {
      setSelectedJob(null)
      setSelectedCourier(null)
      return
    }

    setSelectedJobLoading(true)
    const jobRef = doc(db, 'jobs', jobId)
    const unsubscribe = onSnapshot(
      jobRef,
      (snapshot) => {
        setSelectedJob(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as Job) : null)
        setSelectedJobLoading(false)
      },
      () => setSelectedJobLoading(false)
    )

    return () => unsubscribe()
  }, [searchParams])

  useEffect(() => {
    if (!selectedJob?.courierUid) {
      setSelectedCourier(null)
      return
    }

    const courierRef = doc(db, 'users', selectedJob.courierUid)
    const unsubscribe = onSnapshot(
      courierRef,
      (snapshot) => {
        setSelectedCourier(snapshot.exists() ? snapshot.data() : null)
      },
      () => undefined
    )

    return () => unsubscribe()
  }, [selectedJob?.courierUid])

  const courierLocation = useMemo(() => {
    const location = selectedCourier?.courierProfile?.currentLocation || selectedCourier?.location
    if (!location?.lat || !location?.lng) return null
    return {
      lat: location.lat,
      lng: location.lng,
      heading: location.heading,
      speed: location.speed,
      accuracy: location.accuracy,
      updatedAt: location.timestamp || location.updatedAt,
    }
  }, [selectedCourier])

  const estimatedArrivalMinutes = useMemo(() => {
    if (!courierLocation || !selectedJob?.dropoff) return undefined
    const toRad = (value: number) => (value * Math.PI) / 180
    const R = 6371
    const dLat = toRad(selectedJob.dropoff.lat - courierLocation.lat)
    const dLon = toRad(selectedJob.dropoff.lng - courierLocation.lng)
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(courierLocation.lat)) * Math.cos(toRad(selectedJob.dropoff.lat)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    const distanceKm = R * c
    const mph = 20
    const minutes = (distanceKm / 1.609) / mph * 60
    return Math.max(1, Math.round(minutes))
  }, [courierLocation, selectedJob?.dropoff])

  const loadJobs = async () => {
    try {
      const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'), limit(200))
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

  const downloadFilteredJobsCSV = () => {
    const headers = ['ID', 'Status', 'Customer', 'Courier', 'Pickup', 'Delivery', 'Fee', 'Created']
    const rows = filteredJobs.map(job => [
      job.id,
      getEffectiveStatus(job),
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
      const effectiveStatus = getDisplayStatus(job)
      if (filter === 'all') return true
      if (filter === 'pending') return effectiveStatus === 'pending' && !job.courierUid
      if (filter === 'active') return ['assigned', 'in_progress'].includes(effectiveStatus)
      if (filter === 'completed') return effectiveStatus === 'completed'
      if (filter === 'cancelled') return effectiveStatus === 'cancelled'
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
        {(selectedJobLoading || selectedJob) && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Selected Job Status</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedJobLoading && <div className="text-sm text-gray-500">Loading job…</div>}
              {!selectedJobLoading && !selectedJob && (
                <div className="text-sm text-gray-500">Job not found or access denied.</div>
              )}
              {!selectedJobLoading && selectedJob && (
                <div className="space-y-2 text-sm">
                  <div><strong>ID:</strong> {selectedJob.id}</div>
                  <div><strong>Status:</strong> {getEffectiveStatus(selectedJob)}</div>
                  <div><strong>Display:</strong> {getDisplayStatus(selectedJob)}</div>
                  <div><strong>Courier:</strong> {selectedJob.courierUid || 'Unassigned'}</div>
                  <div><strong>Updated:</strong> {selectedJob.updatedAt?.toDate ? formatDate(selectedJob.updatedAt.toDate()) : '—'}</div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {selectedJob && selectedJob.pickup && selectedJob.dropoff && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>Trip Status</CardTitle>
            </CardHeader>
            <CardContent>
              <LiveTripStatus
                jobId={selectedJob.id}
                status={getEffectiveTripStatus(selectedJob)}
                pickup={{
                  lat: selectedJob.pickup.lat,
                  lng: selectedJob.pickup.lng,
                  address: selectedJob.pickup.address || selectedJob.pickup.label || selectedJob.pickupAddress || 'Pickup',
                }}
                dropoff={{
                  lat: selectedJob.dropoff.lat,
                  lng: selectedJob.dropoff.lng,
                  address: selectedJob.dropoff.address || selectedJob.dropoff.label || selectedJob.deliveryAddress || 'Dropoff',
                }}
                courierInfo={{
                  displayName: selectedCourier?.displayName || selectedCourier?.courierProfile?.displayName,
                  vehicleType: selectedCourier?.courierProfile?.vehicleType,
                  averageRating: selectedCourier?.averageRating,
                }}
                courierLocation={courierLocation}
                pickupPhoto={buildProofPhoto(selectedJob.pickupProof)}
                dropoffPhoto={buildProofPhoto(selectedJob.dropoffProof || selectedJob.deliveryProof)}
                estimatedArrivalMinutes={estimatedArrivalMinutes}
              />
            </CardContent>
          </Card>
        )}
        {/* Search and Export and Create */}
        <div className="bg-white rounded-2xl shadow-lg p-4 flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search by ID, address, customer, courier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            ➕ Create Job
          </button>
          <button
            onClick={downloadFilteredJobsCSV}
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
        <Card variant="elevated">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Jobs ({filteredJobs.length})</CardTitle>
              <button
                onClick={() => exportToCSV(formatJobsForExport(filteredJobs), 'delivery-jobs')}
                disabled={filteredJobs.length === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                📥 Export CSV
              </button>
            </div>
          </CardHeader>
          <CardContent>
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : (
          <div className="space-y-3">
            {filteredJobs.map((job) => (
              <Card
                key={job.id}
                variant="elevated"
                className="hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer"
                onClick={() => navigate(`/jobs?jobId=${job.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-mono text-gray-500">#{job.id.slice(0, 8)}</span>
                        <StatusBadge
                          status={
                            getDisplayStatus(job) === 'completed'
                              ? 'completed'
                              : ['in_progress', 'assigned'].includes(getDisplayStatus(job))
                              ? 'in_progress'
                              : getDisplayStatus(job) === 'cancelled'
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
                  {!['completed', 'cancelled'].includes(getDisplayStatus(job)) && (
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
          </CardContent>
        </Card>
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

      {/* Create Job Modal */}
      <CreateJobModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onJobCreated={() => loadJobs()}
      />
    </div>
  )
}

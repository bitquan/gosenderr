import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { formatCurrency, formatDate } from '../lib/utils'

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
  createdByUid?: string
  createdByEmail?: string
  description?: string
  vehicleType?: string
  notes?: string
  recipientName?: string
  recipientPhone?: string
}

interface TimelineStep {
  label: string
  status: 'completed' | 'current' | 'pending'
  timestamp?: string
  icon: string
}

export default function AdminJobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    if (!jobId) return

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
        console.error('Error loading job:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [jobId])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <p className="text-gray-600">Loading job details...</p>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <p className="text-gray-600">Job not found</p>
      </div>
    )
  }

  const timeline: TimelineStep[] = [
    {
      label: 'Job Created',
      status: 'completed',
      timestamp: job.createdAt?.toDate ? formatDate(job.createdAt.toDate()) : 'Just now',
      icon: '📝'
    },
    {
      label: 'Courier Assigned',
      status: job.courierUid ? 'completed' : job.status === 'pending' ? 'current' : 'pending',
      timestamp: job.acceptedAt?.toDate ? formatDate(job.acceptedAt.toDate()) : undefined,
      icon: '✅'
    },
    {
      label: 'In Progress',
      status: job.status === 'in_progress' ? 'current' : job.status === 'completed' ? 'completed' : 'pending',
      icon: '🚚'
    },
    {
      label: 'Completed',
      status: job.status === 'completed' ? 'completed' : 'pending',
      timestamp: job.completedAt?.toDate ? formatDate(job.completedAt.toDate()) : undefined,
      icon: '🎉'
    }
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <Link 
            to="/admin/jobs" 
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
          >
            <span className="mr-2">←</span>
            Back to All Jobs
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">🔍 Job Details (Admin View)</h1>
              <p className="text-purple-100 font-mono">ID: {job.id}</p>
            </div>
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
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Admin Actions */}
        {job.status !== 'completed' && job.status !== 'cancelled' && (
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>🔧 Admin Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                {job.courierUid && job.status !== 'cancelled' && (
                  <button
                    onClick={async () => {
                      const courierInput = window.prompt('Enter new courier UID to reassign:')
                      if (!courierInput) return
                      
                      setProcessing(true)
                      try {
                        await updateDoc(doc(db, 'jobs', job.id), {
                          courierUid: courierInput,
                          status: 'assigned'
                        })
                        alert('✅ Job reassigned successfully!')
                      } catch (error: any) {
                        console.error('Error reassigning:', error)
                        alert(`Failed to reassign: ${error.message}`)
                      } finally {
                        setProcessing(false)
                      }
                    }}
                    disabled={processing}
                    className="py-3 px-4 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all disabled:opacity-50"
                  >
                    🔄 Reassign Courier
                  </button>
                )}
                
                <button
                  onClick={async () => {
                    if (!window.confirm('Cancel this job? This cannot be undone.')) return
                    
                    setProcessing(true)
                    try {
                      await updateDoc(doc(db, 'jobs', job.id), {
                        status: 'cancelled'
                      })
                      alert('✅ Job cancelled')
                      navigate('/admin/jobs')
                    } catch (error: any) {
                      console.error('Error cancelling:', error)
                      alert(`Failed to cancel: ${error.message}`)
                    } finally {
                      setProcessing(false)
                    }
                  }}
                  disabled={processing}
                  className="py-3 px-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  ❌ Cancel Job
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>📅 Job Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {timeline.map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        step.status === 'completed'
                          ? 'bg-green-100 text-green-600'
                          : step.status === 'current'
                          ? 'bg-purple-100 text-purple-600'
                          : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {step.icon}
                    </div>
                    {index < timeline.length - 1 && (
                      <div className={`w-0.5 h-12 ${step.status === 'completed' ? 'bg-green-300' : 'bg-gray-200'}`} />
                    )}
                  </div>
                  <div className="flex-1 pt-2">
                    <p className={`font-semibold ${step.status === 'completed' ? 'text-gray-900' : 'text-gray-500'}`}>
                      {step.label}
                    </p>
                    {step.timestamp && <p className="text-xs text-gray-500 mt-1">{step.timestamp}</p>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>🗺️ Delivery Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex gap-3">
              <span className="text-2xl">📍</span>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Pickup Location</p>
                <p className="font-semibold text-gray-900">{job.pickupAddress || 'Not specified'}</p>
                {job.pickupLat && job.pickupLng && (
                  <p className="text-xs text-gray-500 mt-1">
                    {job.pickupLat.toFixed(6)}, {job.pickupLng.toFixed(6)}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <span className="text-2xl">🎯</span>
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">Delivery Location</p>
                <p className="font-semibold text-gray-900">{job.deliveryAddress || 'Not specified'}</p>
                {job.deliveryLat && job.deliveryLng && (
                  <p className="text-xs text-gray-500 mt-1">
                    {job.deliveryLat.toFixed(6)}, {job.deliveryLng.toFixed(6)}
                  </p>
                )}
              </div>
            </div>

            {job.recipientName && (
              <div className="flex gap-3">
                <span className="text-2xl">👤</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-500 mb-1">Recipient</p>
                  <p className="font-semibold text-gray-900">{job.recipientName}</p>
                  {job.recipientPhone && <p className="text-sm text-gray-600 mt-1">{job.recipientPhone}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Job Details */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>📋 Job Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {job.description && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Description</p>
                <p className="text-gray-900">{job.description}</p>
              </div>
            )}

            {job.vehicleType && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Vehicle Type</p>
                <p className="text-gray-900 capitalize">{job.vehicleType}</p>
              </div>
            )}

            {job.notes && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-gray-900">{job.notes}</p>
              </div>
            )}

            {job.agreedFee && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Agreed Fee</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(job.agreedFee)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Information */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>👥 User Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Customer</p>
              <p className="font-semibold text-gray-900">{job.createdByEmail || 'Unknown'}</p>
              <p className="text-xs text-gray-500 font-mono mt-1">UID: {job.createdByUid}</p>
            </div>

            {job.courierUid && (
              <div>
                <p className="text-sm text-gray-500 mb-1">Assigned Courier</p>
                <p className="font-semibold text-gray-900 font-mono">{job.courierUid}</p>
              </div>
            )}

            {!job.courierUid && job.status === 'pending' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-900">⏳ Waiting for courier assignment</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

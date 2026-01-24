import { useEffect, useState } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { Avatar } from '../components/Avatar'
import { Link } from 'react-router-dom'
import { getFunctions, httpsCallable } from 'firebase/functions'
import RunnerRejectModal from '../components/RunnerRejectModal'

interface Runner {
  id: string
  email: string
  displayName?: string
  packageRunnerProfile?: {
    status: string
    phone?: string
    homeHub?: { name: string; location?: any; hubId: string }
    vehicleType?: string
    vehicleDetails?: {
      make?: string
      model?: string
      year?: string
      licensePlate?: string
      vin?: string
    }
    driversLicense?: string
    approvedAt?: any
    approvedBy?: string
    rejectedAt?: any
    rejectedBy?: string
    rejectionReason?: string
  }
}

export default function AdminRunnersPage() {
  const { user } = useAuth()
  const [runners, setRunners] = useState<Runner[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [processing, setProcessing] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRunners, setSelectedRunners] = useState<string[]>([])
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectingRunnerId, setRejectingRunnerId] = useState<string | null>(null)

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'))

    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const runnersData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter((u: any) => u.packageRunnerProfile) as Runner[]

        setRunners(runnersData)
        setLoading(false)
      },
      (error) => {
        console.error('Error loading runners:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const handleApprove = async (runnerId: string) => {
    if (!window.confirm('Approve this runner application? This will grant them package runner custom claim.')) return

    setProcessing(runnerId)
    try {
      const functions = getFunctions()
      const setPackageRunnerClaim = httpsCallable(functions, 'setPackageRunnerClaim')
      
      await setPackageRunnerClaim({ userId: runnerId, approved: true })
      alert('✅ Runner approved successfully! Custom claim has been set.')
    } catch (error: any) {
      console.error('Error approving runner:', error)
      alert(`Failed to approve: ${error.message}`)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (runnerId: string, reason?: string) => {
    if (!reason) {
      setRejectingRunnerId(runnerId)
      setShowRejectModal(true)
      return
    }

    setProcessing(runnerId)
    try {
      const functions = getFunctions()
      const setPackageRunnerClaim = httpsCallable(functions, 'setPackageRunnerClaim')
      
      await setPackageRunnerClaim({ userId: runnerId, approved: false, reason })
      alert('Runner application rejected')
      setShowRejectModal(false)
      setRejectingRunnerId(null)
    } catch (error: any) {
      console.error('Error rejecting runner:', error)
      alert(`Failed to reject: ${error.message}`)
    } finally {
      setProcessing(null)
    }
  }

  const handleBulkApprove = async () => {
    if (!window.confirm(`Approve ${selectedRunners.length} runners?`)) return

    for (const runnerId of selectedRunners) {
      await handleApprove(runnerId)
    }
    setSelectedRunners([])
  }

  const toggleSelectRunner = (runnerId: string) => {
    setSelectedRunners(prev => 
      prev.includes(runnerId) 
        ? prev.filter(id => id !== runnerId)
        : [...prev, runnerId]
    )
  }

  const filteredRunners = runners
    .filter((runner) => {
      if (filter === 'all') return true
      return runner.packageRunnerProfile?.status === `${filter}_review` || runner.packageRunnerProfile?.status === filter
    })
    .filter((runner) => {
      if (!searchQuery) return true
      const q = searchQuery.toLowerCase()
      return (
        runner.email?.toLowerCase().includes(q) ||
        runner.displayName?.toLowerCase().includes(q) ||
        runner.packageRunnerProfile?.phone?.includes(q) ||
        runner.packageRunnerProfile?.homeHub?.name?.toLowerCase().includes(q)
      )
    })

  const getStatusBadge = (status: string) => {
    if (status === 'approved') return 'completed'
    if (status === 'rejected') return 'cancelled'
    return 'pending'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <p className="text-gray-600">Loading runners...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
          >
            <span className="mr-2">←</span>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">🚛 Package Runners (Shifters)</h1>
          <p className="text-purple-100">{filteredRunners.length} applications</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Search Bar */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <input
            type="text"
            placeholder="Search by name, email, phone, or hub..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 flex-wrap">
          {[
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
            { label: 'All', value: 'all' }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as any)}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all capitalize ${
                filter === tab.value
                  ? 'bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Bulk Actions */}
        {selectedRunners.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-4 flex items-center justify-between">
            <span className="text-gray-700 font-semibold">
              {selectedRunners.length} runner{selectedRunners.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleBulkApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Approve Selected
              </button>
              <button
                onClick={() => setSelectedRunners([])}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}

        {/* Runners List */}
        {filteredRunners.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🚚</div>
              <p className="text-gray-600 text-lg">
                No {filter !== 'all' ? filter : ''} applications
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRunners.map((runner) => {
              const profile = runner.packageRunnerProfile
              const isSelected = selectedRunners.includes(runner.id)
              const isPending = profile?.status === 'pending_review' || profile?.status === 'pending'
              return (
                <Card key={runner.id} variant="elevated">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      {/* Checkbox for bulk selection */}
                      {isPending && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRunner(runner.id)}
                          className="mt-2 w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                      )}
                      
                      <Avatar
                        fallback={runner.displayName || runner.email}
                        size="lg"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-bold text-gray-900 text-lg">
                              {runner.displayName || 'No name'}
                            </p>
                            <p className="text-sm text-gray-500">{runner.email}</p>
                          </div>
                          <StatusBadge status={getStatusBadge(profile?.status || '')} />
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3 mb-4">
                      {profile?.phone && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Phone</p>
                          <p className="font-medium">{profile.phone}</p>
                        </div>
                      )}

                      {profile?.homeHub && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Home Hub</p>
                          <p className="font-medium">{profile.homeHub.name}</p>
                        </div>
                      )}

                      {profile?.vehicleType && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Vehicle Type</p>
                          <p className="font-medium capitalize">{profile.vehicleType}</p>
                        </div>
                      )}

                      {profile?.driversLicense && (
                        <div className="p-3 bg-gray-50 rounded-xl">
                          <p className="text-xs text-gray-500 mb-1">Driver's License</p>
                          <p className="font-medium">{profile.driversLicense}</p>
                        </div>
                      )}
                    </div>

                    {profile?.vehicleDetails && (
                      <div className="p-3 bg-gray-50 rounded-xl mb-4">
                        <p className="text-xs text-gray-500 mb-1">Vehicle Details</p>
                        <p className="text-sm">
                          {profile.vehicleDetails.year && `${profile.vehicleDetails.year} `}
                          {profile.vehicleDetails.make && `${profile.vehicleDetails.make} `}
                          {profile.vehicleDetails.model && profile.vehicleDetails.model}
                          {profile.vehicleDetails.licensePlate && (
                            <span className="block text-xs text-gray-500 mt-1">
                              License: {profile.vehicleDetails.licensePlate}
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                    {profile?.rejectionReason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl mb-4">
                        <p className="text-xs text-red-500 mb-1">Rejection Reason</p>
                        <p className="text-sm text-red-900">{profile.rejectionReason}</p>
                      </div>
                    )}

                    {/* Actions */}
                    {profile?.status === 'pending_review' && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => handleApprove(runner.id)}
                          disabled={processing === runner.id}
                          className="flex-1 py-3 px-4 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-all disabled:opacity-50"
                        >
                          ✅ Approve
                        </button>
                        <button
                          onClick={() => handleReject(runner.id)}
                          disabled={processing === runner.id}
                          className="flex-1 py-3 px-4 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all disabled:opacity-50"
                        >
                          ❌ Reject
                        </button>
                      </div>
                    )}

                    {profile?.approvedAt && (
                      <div className="text-xs text-gray-500 mt-3">
                        Approved on {profile.approvedAt.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <RunnerRejectModal
        isOpen={showRejectModal}
        onClose={() => {
          setShowRejectModal(false)
          setRejectingRunnerId(null)
        }}
        onConfirm={(reason) => {
          if (rejectingRunnerId) {
            handleReject(rejectingRunnerId, reason)
          }
        }}
        runnerName={
          rejectingRunnerId
            ? runners.find(r => r.id === rejectingRunnerId)?.displayName || 'this runner'
            : 'this runner'
        }
      />
    </div>
  )
}

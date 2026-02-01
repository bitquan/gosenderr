import { useEffect, useState } from 'react'
import { collection, query, orderBy, getDocs, doc, updateDoc, Timestamp, addDoc, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'

interface Dispute {
  id: string
  orderId?: string
  jobId?: string
  userId: string
  userEmail: string
  userRole?: 'customer' | 'courier' | 'vendor'
  reason: string
  description: string
  status: 'open' | 'reviewing' | 'resolved' | 'closed'
  createdAt: any
  resolvedAt?: any
  resolvedBy?: string
  resolution?: string
  resolutionAction?: 'full_refund' | 'partial_refund' | 'no_action' | 'other'
}

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'reviewing' | 'resolved' | 'closed'>('all')
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolutionAction, setResolutionAction] = useState<string>('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    loadDisputes()
  }, [])

  const loadDisputes = async () => {
    try {
      const q = query(collection(db, 'disputes'), orderBy('createdAt', 'desc'), limit(200))
      const snapshot = await getDocs(q)
      const disputesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Dispute[]
      setDisputes(disputesData)
    } catch (error) {
      console.error('Error loading disputes:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async () => {
    if (!selectedDispute || !resolutionAction || !resolutionNotes.trim()) {
      alert('Please select an action and provide resolution notes')
      return
    }

    setProcessing(true)
    try {
      await updateDoc(doc(db, 'disputes', selectedDispute.id), {
        status: 'resolved',
        resolvedAt: Timestamp.now(),
        resolvedBy: 'admin@example.com',
        resolutionAction,
        resolution: resolutionNotes
      })

      await addDoc(collection(db, 'adminLogs'), {
        action: 'dispute_resolved',
        disputeId: selectedDispute.id,
        resolutionAction,
        timestamp: Timestamp.now(),
        adminEmail: 'admin@example.com'
      })

      alert('Dispute resolved successfully')
      setShowResolveModal(false)
      setSelectedDispute(null)
      setResolutionAction('')
      setResolutionNotes('')
      await loadDisputes()
    } catch (error: any) {
      console.error('Error resolving dispute:', error)
      alert(`Failed to resolve: ${error.message}`)
    } finally {
      setProcessing(false)
    }
  }

  const handleMarkReviewing = async (dispute: Dispute) => {
    try {
      await updateDoc(doc(db, 'disputes', dispute.id), {
        status: 'reviewing'
      })
      await loadDisputes()
    } catch (error: any) {
      console.error('Error updating dispute:', error)
      alert(`Failed to update: ${error.message}`)
    }
  }

  const filteredDisputes = disputes.filter(dispute => {
    if (filter === 'all') return true
    return dispute.status === filter
  })

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-red-100 text-red-800',
      reviewing: 'bg-yellow-100 text-yellow-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">⚖️ Disputes & Resolutions</h1>
          <p className="text-purple-100">Manage and resolve customer disputes</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Open Disputes</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{disputes.filter(d => d.status === 'open').length}</p>
              <p className="text-xs text-gray-600 mt-1">Require attention</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Under Review</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{disputes.filter(d => d.status === 'reviewing').length}</p>
              <p className="text-xs text-gray-600 mt-1">In progress</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Resolved</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{disputes.filter(d => d.status === 'resolved').length}</p>
              <p className="text-xs text-gray-600 mt-1">Completed</p>
            </CardContent>
          </Card>

          <Card variant="elevated">
            <CardContent className="p-6">
              <p className="text-sm text-gray-500 font-semibold">Total Disputes</p>
              <p className="text-3xl font-bold text-purple-600 mt-2">{disputes.length}</p>
              <p className="text-xs text-gray-600 mt-1">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 flex-wrap">
          {(['all', 'open', 'reviewing', 'resolved', 'closed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                filter === f
                  ? 'bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="capitalize">{f === 'all' ? 'All' : f}</span>
            </button>
          ))}
        </div>

        {/* Disputes List */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Disputes ({filteredDisputes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-12">Loading disputes...</div>
            ) : filteredDisputes.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">⚖️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Disputes</h3>
                <p className="text-gray-600">
                  {filter !== 'all' ? `No ${filter} disputes found` : 'No disputes have been filed yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDisputes.map((dispute) => (
                  <button
                    key={dispute.id}
                    onClick={() => {
                      setSelectedDispute(dispute)
                      setShowResolveModal(true)
                      setResolutionNotes(dispute.resolution || '')
                    }}
                    className="w-full text-left"
                  >
                    <Card variant="elevated" className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(dispute.status)}`}>
                                {dispute.status.toUpperCase()}
                              </span>
                              {dispute.userRole && (
                                <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold capitalize">
                                  {dispute.userRole}
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-gray-900 mb-1">{dispute.reason}</p>
                            <p className="text-sm text-gray-600 mb-2">{dispute.description}</p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                              <span>👤 {dispute.userEmail}</span>
                              {dispute.orderId && <span>📦 Order: {dispute.orderId.slice(0, 8)}</span>}
                              {dispute.jobId && <span>💼 Job: {dispute.jobId.slice(0, 8)}</span>}
                              <span>📅 {formatDate(dispute.createdAt)}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold text-gray-900">
                              {dispute.status === 'resolved' ? '✓ Resolved' : 'Click to review'}
                            </p>
                          </div>
                        </div>

                        {dispute.status === 'resolved' && dispute.resolution && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-xs font-semibold text-green-700 mb-1">
                              ✓ {dispute.resolutionAction?.replace('_', ' ').toUpperCase()}
                            </p>
                            <p className="text-xs text-gray-600">{dispute.resolution}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resolve Dispute Modal */}
      {showResolveModal && selectedDispute && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] p-6 text-white flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Resolve Dispute</h2>
                <p className="text-purple-100 text-sm mt-1">{selectedDispute.reason}</p>
              </div>
              <button
                onClick={() => {
                  setShowResolveModal(false)
                  setSelectedDispute(null)
                  setResolutionAction('')
                  setResolutionNotes('')
                }}
                className="text-2xl hover:opacity-80"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Dispute Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-500 font-semibold">Description</p>
                  <p className="text-gray-900 mt-1">{selectedDispute.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Dispute ID</p>
                    <p className="text-gray-900 font-mono text-xs">{selectedDispute.id.slice(0, 16)}...</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Filer</p>
                    <p className="text-gray-900">{selectedDispute.userEmail}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Filed On</p>
                    <p className="text-gray-900">{formatDate(selectedDispute.createdAt)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-semibold">Role</p>
                    <p className="text-gray-900 capitalize">{selectedDispute.userRole}</p>
                  </div>
                </div>
              </div>

              {/* Current Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <span className={`inline-block px-4 py-2 rounded-lg font-semibold text-sm ${getStatusColor(selectedDispute.status)}`}>
                  {selectedDispute.status.toUpperCase()}
                </span>
              </div>

              {/* Resolution Action */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Resolution Action *</label>
                <div className="space-y-2">
                  {[
                    { value: 'full_refund', label: '💰 Full Refund to Customer' },
                    { value: 'partial_refund', label: '💵 Partial Refund' },
                    { value: 'no_action', label: '🚫 No Action Required' },
                    { value: 'other', label: '📝 Other Action' }
                  ].map((action) => (
                    <label
                      key={action.value}
                      className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                        resolutionAction === action.value
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-300 hover:border-green-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="resolutionAction"
                        value={action.value}
                        checked={resolutionAction === action.value}
                        onChange={(e) => setResolutionAction(e.target.value)}
                        className="mr-3"
                      />
                      <span className="text-sm font-medium text-gray-900">{action.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Resolution Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Resolution Notes *</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain the resolution and any actions taken..."
                  className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 h-32 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowResolveModal(false)
                    setSelectedDispute(null)
                    setResolutionAction('')
                    setResolutionNotes('')
                  }}
                  disabled={processing}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                {selectedDispute.status === 'open' && (
                  <button
                    onClick={() => {
                      setSelectedDispute({ ...selectedDispute, status: 'reviewing' })
                      handleMarkReviewing(selectedDispute)
                    }}
                    disabled={processing}
                    className="flex-1 px-4 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition font-semibold disabled:opacity-50"
                  >
                    Mark as Reviewing
                  </button>
                )}
                <button
                  onClick={handleResolve}
                  disabled={!resolutionAction || !resolutionNotes.trim() || processing}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold disabled:opacity-50"
                >
                  {processing ? 'Resolving...' : 'Resolve Dispute'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

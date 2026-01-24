import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { formatDate } from '../lib/utils'
import { Link } from 'react-router-dom'

interface Dispute {
  id: string
  jobId: string
  userId: string
  userEmail: string
  userRole: 'customer' | 'courier'
  reason: string
  description: string
  status: 'open' | 'reviewing' | 'resolved'
  createdAt: any
  resolvedAt?: any
  resolvedBy?: string
  resolution?: string
  resolutionAction?: 'full_refund' | 'partial_refund' | 'no_action' | 'other'
}

export default function DisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'open' | 'reviewing' | 'resolved'>('all')
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null)
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [resolutionAction, setResolutionAction] = useState<string>('')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'disputes'), orderBy('createdAt', 'desc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const disputesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Dispute[]
      setDisputes(disputesData)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleResolve = async () => {
    if (!selectedDispute || !resolutionAction || !resolutionNotes.trim()) {
      alert('Please select an action and provide resolution notes')
      return
    }

    setProcessing(true)
    try {
      await updateDoc(doc(db, 'disputes', selectedDispute.id), {
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: 'admin',
        resolutionAction,
        resolution: resolutionNotes
      })

      alert('Dispute resolved successfully')
      setShowResolveModal(false)
      setSelectedDispute(null)
      setResolutionAction('')
      setResolutionNotes('')
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
    } catch (error: any) {
      console.error('Error updating dispute:', error)
      alert(`Failed to update: ${error.message}`)
    }
  }

  const filteredDisputes = disputes.filter(dispute => {
    if (filter === 'all') return true
    return dispute.status === filter
  })

  const getStatusBadge = (status: string) => {
    if (status === 'resolved') return 'completed'
    if (status === 'reviewing') return 'in_progress'
    return 'pending'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <p className="text-gray-600">Loading disputes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
          >
            <span className="mr-2">←</span>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">⚖️ Dispute Management</h1>
          <p className="text-purple-100">{disputes.length} total disputes</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 flex-wrap">
          {(['all', 'open', 'reviewing', 'resolved'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all capitalize ${
                filter === f
                  ? 'bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {f} ({disputes.filter(d => f === 'all' ? true : d.status === f).length})
            </button>
          ))}
        </div>

        {/* Disputes List */}
        {filteredDisputes.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">⚖️</div>
              <p className="text-gray-600 text-lg">
                No {filter !== 'all' ? filter : ''} disputes
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredDisputes.map((dispute) => (
              <Card key={dispute.id} variant="elevated">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-mono text-gray-500">#{dispute.id.slice(0, 8)}</span>
                        <StatusBadge status={getStatusBadge(dispute.status)} />
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          dispute.userRole === 'customer' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {dispute.userRole}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">
                        {formatDate(dispute.createdAt?.toDate?.() || new Date())}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Reason:</p>
                    <p className="text-lg font-bold text-gray-900">{dispute.reason}</p>
                  </div>

                  <div className="mb-4 p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm font-semibold text-gray-700 mb-1">Description:</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{dispute.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-gray-500 mb-1">Filed By</p>
                      <p className="font-medium">{dispute.userEmail}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-gray-500 mb-1">Related Job</p>
                      <Link 
                        to={`/jobs/${dispute.jobId}`}
                        className="font-medium text-purple-600 hover:underline"
                      >
                        {dispute.jobId.slice(0, 8)}...
                      </Link>
                    </div>
                  </div>

                  {dispute.status === 'resolved' && dispute.resolution && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-xl mb-4">
                      <p className="text-xs text-green-600 font-semibold mb-1">
                        Resolution ({dispute.resolutionAction?.replace('_', ' ')})
                      </p>
                      <p className="text-sm text-green-900">{dispute.resolution}</p>
                      {dispute.resolvedAt && (
                        <p className="text-xs text-green-600 mt-2">
                          Resolved: {formatDate(dispute.resolvedAt.toDate())}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Admin Actions */}
                  {dispute.status !== 'resolved' && (
                    <div className="flex gap-2 pt-3 border-t border-gray-100">
                      {dispute.status === 'open' && (
                        <button
                          onClick={() => handleMarkReviewing(dispute)}
                          className="flex-1 py-2 px-4 bg-yellow-500 text-white rounded-lg text-sm font-semibold hover:bg-yellow-600 transition-colors"
                        >
                          👀 Mark as Reviewing
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedDispute(dispute)
                          setShowResolveModal(true)
                        }}
                        className="flex-1 py-2 px-4 bg-green-500 text-white rounded-lg text-sm font-semibold hover:bg-green-600 transition-colors"
                      >
                        ✅ Resolve Dispute
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Resolve Dispute Modal */}
      {showResolveModal && selectedDispute && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Resolve Dispute</h2>
            
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Dispute:</strong> {selectedDispute.reason}
              </p>
              <p className="text-xs text-blue-600">
                Filed by: {selectedDispute.userEmail} ({selectedDispute.userRole})
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Action *
              </label>
              <div className="space-y-2">
                {[
                  { value: 'full_refund', label: '💰 Full Refund to Customer' },
                  { value: 'partial_refund', label: '💵 Partial Refund' },
                  { value: 'no_action', label: '🚫 No Action Required' },
                  { value: 'other', label: '📝 Other Action' }
                ].map((action) => (
                  <label
                    key={action.value}
                    className={`flex items-center p-3 border rounded-md cursor-pointer transition-colors ${
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
                      className="mr-3 text-green-600"
                    />
                    <span className="text-sm">{action.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Notes *
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explain the resolution and any actions taken..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={4}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowResolveModal(false)
                  setSelectedDispute(null)
                  setResolutionAction('')
                  setResolutionNotes('')
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolve}
                disabled={!resolutionAction || !resolutionNotes.trim() || processing}
                className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {processing ? 'Resolving...' : 'Resolve Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

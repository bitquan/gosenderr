import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { formatCurrency, formatDate } from '../lib/utils'

export default function JobDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const navigate = useNavigate()
  const [job, setJob] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [feeInput, setFeeInput] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!jobId) return
    const ref = doc(db, 'jobs', jobId)

    // Use realtime updates so admin sees changes
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setJob(null)
      } else {
        const data = { id: snap.id, ...(snap.data() as any) }
        setJob(data)
        setFeeInput(((data as any).agreedFee ?? (data as any).estimatedFee ?? '').toString())
      }
      setLoading(false)
    }, (err) => {
      console.error('Job snapshot error:', err)
      setLoading(false)
    })

    return () => unsub()
  }, [jobId])

  const handleSave = async () => {
    if (!jobId) return
    setError('')
    const parsed = parseFloat(feeInput)
    if (Number.isNaN(parsed) || parsed < 0) {
      setError('Please enter a valid non-negative number for the fee')
      return
    }

    setSaving(true)
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        agreedFee: Math.round(parsed * 100) / 100,
        updatedAt: serverTimestamp(),
      })
      alert('Agreed fee updated')
    } catch (err: any) {
      console.error('Failed to update job fee:', err)
      setError(err?.message || 'Failed to update job')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6">Loading job...</div>
  if (!job) return <div className="p-6">Job not found</div>

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Job #{job.id}</h1>
          <p className="text-sm text-gray-500">Created: {job.createdAt?.toDate ? formatDate(job.createdAt.toDate()) : 'N/A'}</p>
        </div>
        <div>
          <button onClick={() => navigate('/jobs')} className="px-3 py-2 bg-gray-100 rounded">Back to Jobs</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Pickup</h3>
          <p className="text-sm text-gray-900">{job.pickup?.address || job.pickupAddress || 'N/A'}</p>
          <h3 className="text-sm font-semibold text-gray-700 mt-4 mb-2">Delivery</h3>
          <p className="text-sm text-gray-900">{job.dropoff?.address || job.deliveryAddress || 'N/A'}</p>

          <div className="mt-4 text-sm text-gray-600">
            <div>Type: {job.type || job.jobType || 'package'}</div>
            <div>Status: {job.status}</div>
            <div>Courier: {job.courierUid || 'Unassigned'}</div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Pricing</h3>
          <div className="mb-3">
            <p className="text-xs text-gray-500">Estimated Fee</p>
            <p className="text-lg font-bold text-purple-600">{job.estimatedFee ? formatCurrency(job.estimatedFee) : '—'}</p>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">Agreed Fee ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={feeInput}
              onChange={(e) => setFeeInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-md">{saving ? 'Saving...' : 'Save Fee'}</button>
            <button onClick={() => { setFeeInput((job.agreedFee ?? job.estimatedFee ?? '').toString()) }} className="py-2 px-4 border rounded-md">Reset</button>
          </div>
        </div>
      </div>
    </div>
  )
}

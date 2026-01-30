import React, { useState } from 'react'
import { Job } from '@/lib/v2/types'
import { AcceptJobModal, PriceConfirmModal } from '@/components/v2/AcceptJobModal'
import { useClaimJob } from '@/hooks/v2/useClaimJob'
import { useAuthUser } from '@/hooks/v2/useAuthUser'
interface Props {
  job: Job
  pickupMiles?: number
  jobMiles?: number
  fee: number
  loading?: boolean
  onAccept?: (jobId: string, fee: number) => void
}

export default function AvailableJobCard({ job, pickupMiles, jobMiles, fee, loading, onAccept }: Props) {
  const [localAcceptOpen, setLocalAcceptOpen] = useState(false)
  const [localPriceMismatch, setLocalPriceMismatch] = useState<{ jobId: string; clientFee: number; serverFee: number } | null>(null)
  const { claim } = useClaimJob()
  const { uid, loading: authLoading } = useAuthUser()

  const handleLocalConfirm = async (jobId: string, agreedFee: number) => {
    if (authLoading) {
      // Wait for auth to initialize; user will retry
      return false
    }

    if (!uid) {
      alert('You must be signed in to accept a job.')
      setLocalAcceptOpen(false)
      return false
    }

    // Use centralized claim hook with real user uid
    const res = await claim(jobId, uid, agreedFee)
    if (res.success) {
      setLocalAcceptOpen(false)
      return true
    }

    if (res.type === 'price-mismatch' && res.serverFee !== undefined) {
      setLocalPriceMismatch({ jobId, clientFee: agreedFee, serverFee: res.serverFee })
      return false
    }

    alert(res.message || 'Failed to accept job.')
    setLocalAcceptOpen(false)
    return false
  }

  const handleAcceptClick = () => {
    if (onAccept) {
      onAccept(job.id, fee)
    } else {
      setLocalAcceptOpen(true)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-500">{job.createdAt?.toDate ? new Date(job.createdAt.toDate()).toLocaleString() : ''}</div>
          <div className="text-base font-semibold">{job.pickup?.label || (job.pickup ? `${job.pickup.lat.toFixed(4)}, ${job.pickup.lng.toFixed(4)}` : 'N/A')}</div>
          <div className="text-sm text-gray-600">{job.dropoff?.label || (job.dropoff ? `${job.dropoff.lat.toFixed(4)}, ${job.dropoff.lng.toFixed(4)}` : 'N/A')}</div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Trip</div>
          <div className="text-lg font-bold text-green-600">{fee ? `$${fee.toFixed(2)}` : '—'}</div>
          {job.agreedFee && job.agreedFee !== fee && (
            <div className="text-xs text-yellow-700 mt-1">Server price: <strong>${job.agreedFee.toFixed(2)}</strong></div>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-3">
        <button
          onClick={handleAcceptClick}
          disabled={loading}
          className={`flex-1 py-2 rounded-lg text-white font-semibold ${loading ? 'bg-gray-300' : 'bg-emerald-500 hover:bg-emerald-600'}`}
        >
          {loading ? 'Accepting...' : 'Accept Job'}
        </button>
      </div>

      {/* Local accept modal fallback if parent didn't provide onAccept */}
      <AcceptJobModal
        isOpen={localAcceptOpen}
        job={job}
        fee={fee}
        onClose={() => setLocalAcceptOpen(false)}
        onConfirm={async (jobId, agreedFee) => { await handleLocalConfirm(jobId, agreedFee); }}
      />

      <PriceConfirmModal
        isOpen={!!localPriceMismatch}
        clientFee={localPriceMismatch?.clientFee ?? 0}
        serverFee={localPriceMismatch?.serverFee ?? 0}
        onCancel={() => setLocalPriceMismatch(null)}
        onConfirmServerPrice={async (fee) => {
          if (!localPriceMismatch) return
          if (!uid) {
            alert('You must be signed in to accept a job.')
            setLocalPriceMismatch(null)
            setLocalAcceptOpen(false)
            return
          }

          await claim(localPriceMismatch.jobId, uid, fee)
          setLocalPriceMismatch(null)
          setLocalAcceptOpen(false)
        }}
      />
    </div>
  )
}

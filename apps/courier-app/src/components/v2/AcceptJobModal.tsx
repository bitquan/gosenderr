import React, { useState } from 'react'
import { Job } from '@/lib/v2/types'

interface AcceptJobModalProps {
  isOpen: boolean
  job?: Job | null
  fee?: number | null
  onClose: () => void
  onConfirm: (jobId: string, fee: number) => Promise<void>
}

export function AcceptJobModal({ isOpen, job, fee, onClose, onConfirm }: AcceptJobModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen || !job) return null

  const handleAccept = async () => {
    if (!fee) return alert('No fee calculated');
    setIsSubmitting(true)
    try {
      await onConfirm(job.id, fee)
    } catch (err) {
      // Let caller handle errors (they may open a server-price confirm)
      console.error('AcceptJobModal: confirm error', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Accept Job</h2>
          <button onClick={() => !isSubmitting && onClose()} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-500">Pickup</p>
          <p className="font-semibold text-gray-900">{job.pickup?.label || "Unknown"}</p>
          <p className="mt-3 text-sm text-gray-500">Dropoff</p>
          <p className="font-semibold text-gray-900">{job.dropoff?.label || "Unknown"}</p>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">Trip</p>
            <p className="text-xl font-bold text-green-600">{fee ? `$${fee.toFixed(2)}` : '—'}</p>
          </div>
          <div className="text-right">
            {/* Placeholder for ETA / distance if we want to add later */}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            data-testid="accept-job-accept-btn"
            onClick={handleAccept}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-white ${isSubmitting ? 'bg-gray-300' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Accepting...' : `Accept Job${fee ? ` — $${fee.toFixed(2)}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

interface PriceConfirmModalProps {
  isOpen: boolean
  clientFee: number
  serverFee: number
  onCancel: () => void
  onConfirmServerPrice: (fee: number) => Promise<void>
}

export function PriceConfirmModal({ isOpen, clientFee, serverFee, onCancel, onConfirmServerPrice }: PriceConfirmModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await onConfirmServerPrice(serverFee)
    } catch (err) {
      console.error('PriceConfirmModal confirm error', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Price changed</h2>
          <button onClick={() => !isSubmitting && onCancel()} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-700">Server calculated fee is <strong>${serverFee.toFixed(2)}</strong> (your price: ${clientFee.toFixed(2)}).</p>
          <p className="text-sm text-gray-500 mt-2">Accept the server price to claim the job, or cancel.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>

          <button
            data-testid="accept-server-price-btn"
            onClick={handleConfirm}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold text-white ${isSubmitting ? 'bg-gray-300' : 'bg-emerald-600 hover:bg-emerald-700'}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Accepting...' : `Accept server price — $${serverFee.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'

interface RunnerRejectModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  runnerName?: string
}

export default function RunnerRejectModal({
  isOpen,
  onClose,
  onConfirm,
  runnerName = 'this runner',
}: RunnerRejectModalProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [customReason, setCustomReason] = useState('')

  const predefinedReasons = [
    'Incomplete documentation',
    'Invalid vehicle registration',
    'Expired insurance documents',
    'Failed background check',
    'Insufficient experience',
    'Service area not supported',
  ]

  const handleConfirm = () => {
    const reason = selectedReason === 'custom' ? customReason : selectedReason
    if (!reason.trim()) {
      alert('Please select or enter a rejection reason')
      return
    }
    onConfirm(reason)
    // Reset state
    setSelectedReason('')
    setCustomReason('')
  }

  const handleClose = () => {
    setSelectedReason('')
    setCustomReason('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Reject Runner Application</h2>
        
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            ⚠️ You are about to reject <strong>{runnerName}</strong>'s runner application.
            They will be notified of the rejection and the reason provided.
          </p>
        </div>

        <div className="space-y-3 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select rejection reason:
          </label>
          
          {predefinedReasons.map((reason) => (
            <label
              key={reason}
              className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                selectedReason === reason
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300 hover:border-red-300 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="rejectReason"
                value={reason}
                checked={selectedReason === reason}
                onChange={(e) => setSelectedReason(e.target.value)}
                className="mt-0.5 mr-3 text-red-600 focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">{reason}</span>
            </label>
          ))}

          <label
            className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
              selectedReason === 'custom'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 hover:border-red-300 hover:bg-gray-50'
            }`}
          >
            <input
              type="radio"
              name="rejectReason"
              value="custom"
              checked={selectedReason === 'custom'}
              onChange={(e) => setSelectedReason(e.target.value)}
              className="mt-0.5 mr-3 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">Other (specify below)</span>
          </label>

          {selectedReason === 'custom' && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Enter custom rejection reason..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              rows={3}
            />
          )}
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
          >
            Reject Application
          </button>
        </div>
      </div>
    </div>
  )
}

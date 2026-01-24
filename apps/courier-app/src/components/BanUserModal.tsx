import { useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'

interface BanUserModalProps {
  user: {
    id: string
    email: string
    banned?: boolean
  }
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const banReasons = [
  'Fraudulent activity',
  'Abusive behavior',
  'Multiple policy violations',
  'Payment disputes',
  'Spam or scam reports',
  'Other (specify below)'
]

export default function BanUserModal({ user, isOpen, onClose, onSuccess }: BanUserModalProps) {
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const isBanning = !user.banned

  const handleSubmit = async () => {
    if (isBanning && !reason && !customReason) {
      setError('Please select or enter a reason for banning')
      return
    }

    setLoading(true)
    setError('')

    try {
      const functions = getFunctions()
      const banUser = httpsCallable(functions, 'banUser')
      
      const finalReason = reason === 'Other (specify below)' ? customReason : reason
      
      await banUser({
        userId: user.id,
        banned: isBanning,
        reason: finalReason || undefined
      })

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error updating ban status:', err)
      setError(err.message || 'Failed to update ban status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-2xl font-bold ${isBanning ? 'text-red-600' : 'text-green-600'}`}>
            {isBanning ? '🚫 Ban User' : '✅ Unban User'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-1">User</p>
          <p className="font-semibold text-gray-900">{user.email}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {isBanning && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Ban *
              </label>
              <div className="space-y-2">
                {banReasons.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={`w-full text-left px-4 py-2 rounded-lg border transition-all ${
                      reason === r
                        ? 'border-red-500 bg-red-50 text-red-900'
                        : 'border-gray-300 hover:border-red-300 bg-white'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {reason === 'Other (specify below)' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Reason
                </label>
                <textarea
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter specific reason..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  rows={3}
                />
              </div>
            )}

            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ Banning will disable the user's account and prevent them from accessing the platform.
              </p>
            </div>
          </>
        )}

        {!isBanning && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Unbanning will restore the user's access to the platform.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all disabled:opacity-50 ${
              isBanning
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {loading ? 'Processing...' : isBanning ? 'Ban User' : 'Unban User'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { getFunctions, httpsCallable } from 'firebase/functions'

interface EditRoleModalProps {
  user: {
    id: string
    email: string
    role?: string
    admin?: boolean
  } | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const roles = [
  { value: 'customer', label: '📦 Customer', description: 'Can create delivery jobs' },
  { value: 'courier', label: '⚡ Courier', description: 'Can accept and deliver jobs' },
  { value: 'package_runner', label: '🚛 Package Runner', description: 'Long-distance package delivery' },
  { value: 'seller', label: '🏪 Seller', description: 'Can sell items in marketplace' },
  { value: 'admin', label: '👑 Admin', description: 'Full platform access' }
]

export default function EditRoleModal({ user, isOpen, onClose, onSuccess }: EditRoleModalProps) {
  const [selectedRole, setSelectedRole] = useState(user?.role || 'customer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen || !user) return null

  const handleSave = async () => {
    if (!selectedRole) return

    setLoading(true)
    setError('')

    try {
      const functions = getFunctions()

      // If changing to/from admin, use Cloud Function
      if (selectedRole === 'admin' || user.admin) {
        const setAdminClaim = httpsCallable(functions, 'setAdminClaim')
        await setAdminClaim({
          userId: user.id,
          isAdmin: selectedRole === 'admin'
        })
      }

      // Update role in Firestore (for non-admin roles)
      if (selectedRole !== 'admin') {
        const { doc, updateDoc } = await import('firebase/firestore')
        const { db } = await import('../lib/firebase')
        
        await updateDoc(doc(db, 'users', user.id), {
          role: selectedRole,
          updatedAt: new Date()
        })
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      console.error('Error updating role:', err)
      setError(err.message || 'Failed to update role')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#6B4EFF] to-[#9D7FFF] bg-clip-text text-transparent">
            Edit User Role
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">User</p>
          <p className="font-semibold text-gray-900">{user.email}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Role
          </label>
          {roles.map((role) => (
            <button
              key={role.value}
              onClick={() => setSelectedRole(role.value)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                selectedRole === role.value
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">
                    {role.label}
                  </div>
                  <div className="text-sm text-gray-600">
                    {role.description}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedRole === role.value
                    ? 'border-purple-500 bg-purple-500'
                    : 'border-gray-300'
                }`}>
                  {selectedRole === role.value && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || selectedRole === user.role}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-[#6B4EFF] to-[#9D7FFF] text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { createUserForAdmin } from '../lib/cloudFunctions'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const roles = [
  { value: 'customer', label: '📦 Customer' },
  { value: 'courier', label: '⚡ Courier' },
  { value: 'package_runner', label: '🚛 Package Runner' },
  { value: 'vendor', label: '🏪 Vendor' },
  { value: 'admin', label: '👑 Admin' }
]

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<'customer' | 'courier' | 'package_runner' | 'vendor' | 'admin'>('customer')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [diagLoading, setDiagLoading] = useState(false)
  const [diagResult, setDiagResult] = useState<any | null>(null)

  if (!isOpen) return null

  const handleCreate = async () => {
    setError('')
    if (!email || !password || !role) return setError('Email, password and role are required')

    setLoading(true)
    try {
      const data = await createUserForAdmin({ email, password, displayName: displayName || undefined, role })
      if (data?.success) {
        onSuccess()
        onClose()
        setEmail('')
        setPassword('')
        setDisplayName('')
        setRole('customer')
      } else {
        setError('Failed to create user')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#6B4EFF] to-[#9D7FFF] bg-clip-text text-transparent">Create User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        <div className="space-y-3 mb-4">
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="email@example.com" />

          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="At least 8 characters" />

          <label className="block text-sm font-medium text-gray-700">Display name (optional)</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="Full name" />

          <label className="block text-sm font-medium text-gray-700">Role</label>
          <div className="grid grid-cols-2 gap-2">
            {roles.map(r => (
              <button key={r.value} onClick={() => setRole(r.value as any)} className={`p-2 rounded-lg border ${role === r.value ? 'border-purple-500 bg-purple-50' : 'border-gray-200 hover:border-purple-300'}`}>
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading} className="px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all">Cancel</button>

          {/* Diagnostic button for emulator debugging only - visible on localhost */}
          {typeof window !== 'undefined' && window.location.hostname.includes('localhost') && (
            <button
              onClick={async () => {
                setDiagResult(null)
                setDiagLoading(true)
                try {
                  const mod = await import('../lib/cloudFunctions')
                  const res = await mod.diagnoseCreateUserCall()
                  setDiagResult(res)
                } catch (err: any) {
                  setDiagResult({ error: err.message || String(err) })
                } finally {
                  setDiagLoading(false)
                }
              }}
              disabled={diagLoading}
              className="px-3 py-3 border-2 border-yellow-300 text-yellow-800 rounded-xl font-semibold hover:bg-yellow-50 transition-all"
            >
              {diagLoading ? 'Diagnosing...' : 'Diag'}
            </button>
          )}

          <button onClick={handleCreate} disabled={loading} className="flex-1 px-4 py-3 bg-gradient-to-r from-[#6B4EFF] to-[#9D7FFF] text-white rounded-xl font-semibold hover:shadow-lg transition-all">{loading ? 'Creating...' : 'Create User'}</button>
        </div>

        {diagResult && (
          <pre className="mt-3 p-3 bg-gray-50 border rounded-lg text-sm overflow-auto">{JSON.stringify(diagResult, null, 2)}</pre>
        )}
      </div>
    </div>
  )
}

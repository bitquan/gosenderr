import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../lib/firebase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!auth) throw new Error('Firebase not initialized')
      await signInWithEmailAndPassword(auth, email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8"
      style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
      }}
    >
      <div className="max-w-md w-full">
        <div 
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          style={{
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
          }}
        >
          {/* Header */}
          <div 
            className="px-8 py-10 text-center text-white"
            style={{
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
            }}
          >
            <div className="text-6xl mb-3">⚙️</div>
            <h1 className="text-3xl font-bold mb-2">Admin Portal</h1>
            <p className="text-slate-300 text-sm">Manage platform & operations</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Administrator Access</h2>
            <p className="text-gray-600 mb-6 text-sm">Sign in to the admin dashboard</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800 flex items-center gap-2">
                    <span>⚠️</span>
                    {error}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-slate-700 transition text-base"
                  placeholder="admin@gosenderr.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-slate-700 transition text-base"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                }}
              >
                {loading ? '🔄 Authenticating...' : '⚙️ Sign In as Admin'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-800 flex items-center justify-center gap-2">
                  <span>🔒</span>
                  Authorized personnel only
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white text-sm">
          <p className="opacity-90">© 2026 GoSenderr • Admin Portal</p>
        </div>
      </div>
    </div>
  )
}

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
    <div className="min-h-screen flex flex-row">
      {/* Left Sidebar - Branding (40%) */}
      <div 
        className="flex-none w-2/5 flex flex-col justify-between p-16"
        style={{
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
        }}
      >
        <div>
          <div className="text-8xl mb-6">⚙️</div>
          <h1 className="text-5xl font-bold text-white mb-4">GoSenderr</h1>
          <p className="text-2xl text-slate-300 font-semibold mb-2">Admin Panel</p>
          <p className="text-slate-400 text-lg">Platform Management & Operations</p>
        </div>
        
        <div className="space-y-4">
          <div className="text-slate-300 text-sm">
            <p className="opacity-75">💡 Manage users, orders, and platform settings</p>
          </div>
          <div className="text-slate-500 text-xs">
            <p>© 2026 GoSenderr • All rights reserved</p>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form (60%) */}
      <div className="flex-1 flex items-center justify-center px-16 py-12 bg-white">
        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600 text-lg">Sign in to your admin account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4">
                <p className="text-sm text-red-800 flex items-center gap-3">
                  <span className="text-lg">⚠️</span>
                  <span>{error}</span>
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200 transition text-base font-medium"
                placeholder="admin@gosenderr.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-slate-700 focus:ring-2 focus:ring-slate-200 transition text-base font-medium"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 text-white font-bold text-lg rounded-lg transition transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: loading ? '#9ca3af' : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              }}
            >
              {loading ? '🔄 Signing in...' : '⚙️ Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-200">
            <div className="flex items-center gap-3 text-gray-600 text-sm">
              <span className="text-lg">🔒</span>
              <p>Authorized personnel only. All access logged.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

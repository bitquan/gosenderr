import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
      className="min-h-screen overflow-y-auto py-8 px-4 sm:px-6 lg:px-8"
      style={{
        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
      }}
    >
      <div className="max-w-md w-full mx-auto">
        <div 
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          style={{
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}
        >
          {/* Header */}
          <div 
            className="px-6 py-8 text-center text-white"
            style={{
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
            }}
          >
            <div className="text-5xl mb-2">⚡</div>
            <h1 className="text-2xl font-bold mb-1">Senderr Portal</h1>
            <p className="text-emerald-100 text-sm">Send it. Earn it. Your way.</p>
          </div>

          {/* Form */}
          <div className="px-6 py-6">
            {/* Back Button */}
            <a 
              href="https://gosenderr-6773f.web.app"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <span className="text-lg">←</span>
              <span className="text-xs font-medium">Back to role selection</span>
            </a>
            
            <h2 className="text-xl font-bold text-gray-900 mb-1">Local Deliveries</h2>
            <p className="text-gray-600 mb-4 text-sm">Sign in to your courier account</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-800 flex items-center gap-2">
                    <span>⚠️</span>
                    {error}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 transition text-sm"
                  placeholder="courier@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 transition text-sm"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: loading ? '#9ca3af' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                }}
              >
                {loading ? '🔄 Signing in...' : '⚡ Sign In as Senderr'}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-600">
              <p>
                New courier?{' '}
                <Link to="/signup" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 mb-4 text-white text-xs opacity-90">
          <p>© 2026 GoSenderr • Senderr Portal</p>
        </div>
      </div>
    </div>
  )
}

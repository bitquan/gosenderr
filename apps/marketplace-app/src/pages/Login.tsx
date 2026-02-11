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
      
      // Sign in user
      await signInWithEmailAndPassword(auth, email, password)

      // Navigate to Senderrplace home
      navigate('/marketplace')
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    >
      <div className="max-w-md w-full">
        <div 
          className="rounded-3xl border border-violet-200/80 bg-gradient-to-br from-violet-200/80 via-fuchsia-200/65 to-blue-200/70 shadow-2xl overflow-hidden"
          style={{
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}
        >
          {/* Header */}
          <div 
            className="px-8 py-10 text-center text-white bg-gradient-to-r from-purple-600 to-blue-600"
          >
            <div className="text-6xl mb-3">🛍️</div>
            <h1 className="text-3xl font-bold mb-2">Senderrplace Portal</h1>
            <p className="text-purple-100 text-sm">Buy, sell, and ship anything with Senderrplace trust</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
              <a 
                href="/signup"
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                Sign Up
              </a>
            </div>

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
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition text-base"
                  placeholder="you@example.com"
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
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition text-base"
                  placeholder="••••••••"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <a href="/forgot-password" className="text-purple-600 hover:text-purple-800 font-medium">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              >
                {loading ? '🔄 Signing in...' : '🛍️ Sign In'}
              </button>
            </form>
          </div>
        </div>

        {/* Back to Senderrplace */}
        <div className="text-center mt-6">
            <a 
              href="/marketplace"
              className="text-sm text-white hover:text-purple-100 font-medium transition-colors block mb-4"
            >
              ← Browse Senderrplace without signing in
            </a>
            <p className="text-white text-sm opacity-90">© 2026 Senderrplace by GoSenderr</p>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      if (!auth || !db) throw new Error('Firebase not initialized')

      console.log('📝 Creating user account with email:', email)
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user
      console.log('✅ User account created:', user.uid)

      console.log('📝 Creating Firestore user document...')
      // Create user profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: email.toLowerCase(),
        fullName,
        phone,
        role: 'courier',
        createdAt: new Date(),
        courierProfile: {
          isOnline: false,
          workModes: {
            packagesEnabled: false,
            foodEnabled: false,
          },
          stats: {
            totalDeliveries: 0,
            totalEarnings: 0,
            rating: 0,
            completionRate: 0,
          },
        },
      })
      console.log('✅ Firestore user document created')

      console.log('🚀 Navigating to onboarding...')
      // Navigate to onboarding
      navigate('/onboarding')
    } catch (err: any) {
      console.error('❌ Signup error:', err)
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please sign in instead.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address')
      } else {
        setError(err.message || 'Failed to create account')
      }
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
            <h1 className="text-2xl font-bold mb-1">Become a Senderr</h1>
            <p className="text-emerald-100 text-sm">Start earning on your schedule</p>
          </div>

          {/* Form */}
          <div className="px-6 py-6">
            {/* Back Button */}
            <Link 
              to="/login"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <span className="text-lg">←</span>
              <span className="text-xs font-medium">Back to sign in</span>
            </Link>
            
            <h2 className="text-xl font-bold text-gray-900 mb-1">Create Account</h2>
            <p className="text-gray-600 mb-4 text-sm">Join the local courier network</p>

            <form onSubmit={handleSubmit} className="space-y-3">
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
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 transition text-sm"
                  placeholder="John Doe"
                />
              </div>

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
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 transition text-sm"
                  placeholder="(555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 transition text-sm"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 transition text-sm"
                  placeholder="Re-enter password"
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
                {loading ? '🔄 Creating Account...' : '⚡ Create Courier Account'}
              </button>
            </form>

            <div className="mt-4 text-center text-sm text-gray-600">
              <p>
                Already have an account?{' '}
                <Link to="/login" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                  Sign in
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

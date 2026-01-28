import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth } from '../lib/firebase'
import { db } from '../lib/firebase/client'

type SignupRole = 'customer' | 'vendor' | 'courier' | 'admin'

const roleInfo = {
  customer: {
    icon: '👤',
    title: 'Customer',
    description: 'Browse marketplace and order deliveries',
    gradient: 'from-blue-600 to-purple-600'
  },
  vendor: {
    icon: '🏪',
    title: 'Vendor',
    description: 'Sell items on the marketplace',
    gradient: 'from-purple-600 to-pink-600'
  },
  courier: {
    icon: '🚗',
    title: 'Courier',
    description: 'Deliver packages and earn money',
    gradient: 'from-green-600 to-teal-600'
  },
  admin: {
    icon: '👨‍💼',
    title: 'Admin',
    description: 'Manage platform operations',
    gradient: 'from-gray-600 to-gray-800'
  }
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<SignupRole>('customer')
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
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        displayName: displayName || user.email?.split('@')[0],
        role: role,
        primaryRole: role,
        roles: [role], // Multi-role support
        profilePhotoUrl: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        averageRating: 0,
        totalRatings: 0,
        totalDeliveries: 0,
      })

      // Navigate based on selected role
      const roleRoutes = {
        customer: '/dashboard',
        vendor: '/vendor/dashboard',
        courier: '/courier/dashboard',
        admin: '/admin/dashboard'
      }
      navigate(roleRoutes[role])
    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err.message || 'Failed to create account')
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
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          style={{
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}
        >
          {/* Header */}
          <div 
            className={`px-8 py-10 text-center text-white bg-gradient-to-r ${roleInfo[role].gradient}`}
          >
            <div className="text-6xl mb-3">{roleInfo[role].icon}</div>
            <h1 className="text-3xl font-bold mb-2">Join as {roleInfo[role].title}</h1>
            <p className="text-purple-100 text-sm">{roleInfo[role].description}</p>
          </div>

          {/* Form */}
          <div className="px-8 py-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
              <a 
                href="/login"
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                Sign In
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

              {/* Role Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  I want to
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(roleInfo) as SignupRole[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                        role === r
                          ? `bg-gradient-to-r ${roleInfo[r].gradient} text-white shadow-lg`
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <div className="text-2xl mb-1">{roleInfo[r].icon}</div>
                      <div className="text-sm">{roleInfo[r].title}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition text-base"
                  placeholder="John Doe"
                />
              </div>

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

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 transition text-base"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-4 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${roleInfo[role].gradient}`}
              >
                {loading ? '🔄 Creating account...' : `${roleInfo[role].icon} Create ${roleInfo[role].title} Account`}
              </button>

              <p className="text-xs text-gray-500 text-center">
                By signing up, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

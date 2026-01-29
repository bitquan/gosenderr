import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth } from '../lib/firebase'
import { db } from '../lib/firebase/client'

type LoginRole = 'customer' | 'vendor' | 'courier' | 'admin'

const roleInfo = {
  customer: {
    icon: '👤',
    title: 'Customer',
    description: 'Browse marketplace and order deliveries',
    gradient: 'from-blue-600 to-purple-600',
    route: '/dashboard'
  },
  vendor: {
    icon: '🏪',
    title: 'Vendor',
    description: 'Manage your marketplace items',
    gradient: 'from-purple-600 to-pink-600',
    route: '/vendor/dashboard'
  },
  courier: {
    icon: '🚗',
    title: 'Courier',
    description: 'Deliver packages and earn money',
    gradient: 'from-green-600 to-teal-600',
    route: '/courier/dashboard'
  },
  admin: {
    icon: '👨‍💼',
    title: 'Admin',
    description: 'Manage platform operations',
    gradient: 'from-gray-600 to-gray-800',
    route: '/admin/dashboard'
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<LoginRole>('customer')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!auth || !db) throw new Error('Firebase not initialized')
      
      // Sign in user
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      // Get current user document
      const userDocRef = doc(db, 'users', user.uid)
      const userDoc = await getDoc(userDocRef)

      if (userDoc.exists()) {
        // Update user's primary role and add to roles array if not already there
        const userData = userDoc.data()
        const existingRoles = userData.roles || [userData.role]
        
        await updateDoc(userDocRef, {
          primaryRole: role,
          role: role, // Keep for backward compatibility
          roles: existingRoles.includes(role) ? existingRoles : [...existingRoles, role],
          updatedAt: serverTimestamp()
        })
      }

      // Navigate based on selected role
      navigate(roleInfo[role].route)
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
            <h1 className="text-3xl font-bold mb-2">{roleInfo[role].title} Portal</h1>
            <p className="text-purple-100 text-sm">{roleInfo[role].description}</p>
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

              {/* Role Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Sign in as
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(roleInfo) as LoginRole[]).map((r) => (
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
                className={`w-full py-3 px-4 text-white font-semibold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed bg-gradient-to-r ${roleInfo[role].gradient}`}
              >
                {loading ? '🔄 Signing in...' : `${roleInfo[role].icon} Sign In as ${roleInfo[role].title}`}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-white text-sm">
          <p className="opacity-90">© 2026 GoSenderR • Multi-Role Platform</p>
        </div>
      </div>
    </div>
  )
}

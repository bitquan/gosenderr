import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signUpWithEmail, getAuthSafe } from '@/lib/firebase/auth'
import { db } from '@/lib/firebase/client'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { sendEmailVerification } from 'firebase/auth'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const credential = await signUpWithEmail(email, password)
      const user = credential.user

      // Set basic user doc with role customer
      await setDoc(doc(db, `users/${user.uid}`), {
        role: 'customer',
        displayName: name,
        phoneNumber: phone || null,
        createdAt: serverTimestamp(),
      }, { merge: true })

      // Send verification email
      const auth = getAuthSafe()
      if (auth && auth.currentUser) {
        await sendEmailVerification(auth.currentUser)
      }

      alert('Account created — check your email to verify your address.')
      navigate('/login')
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <h2 className="text-3xl font-bold text-center mb-6">Create an Account</h2>

        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-2xl shadow">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-4 py-3 border rounded-lg" placeholder="Your name" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-3 border rounded-lg" placeholder="you@example.com" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-3 border rounded-lg" placeholder="Choose a password" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone (optional)</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border rounded-lg" placeholder="(555) 555-5555" />
          </div>

          <button type="submit" disabled={loading} className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold">
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-xs text-gray-500 text-center mt-2">By creating an account you will receive a verification email.</p>
        </form>

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Already have an account? <a href="/login" className="text-purple-600">Sign in</a></p>
        </div>
      </div>
    </div>
  )
}

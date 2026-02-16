import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { signInWithEmail } from '../lib/firebase'

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
      await signInWithEmail(email, password)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050A2F] via-[#2B0F68] to-[#4C1D95] px-4 py-8">
      <div className="mx-auto grid w-full max-w-5xl gap-6 rounded-3xl border border-white/20 bg-slate-950/35 p-4 shadow-2xl backdrop-blur sm:p-6 lg:grid-cols-[1.2fr,1fr] lg:p-8">
        <div className="rounded-2xl border border-white/15 bg-gradient-to-br from-blue-700/55 to-indigo-800/65 p-6 text-white">
          <p className="text-xs uppercase tracking-[0.25em] text-blue-100/75">Senderr Courier</p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
            Drive local deliveries with one control center.
          </h1>
          <p className="mt-4 max-w-md text-sm text-blue-100/85 sm:text-base">
            Sign in to claim jobs, open route navigation in Maps, and manage payout settings.
          </p>
          <div className="mt-6 space-y-3 text-sm">
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
              Real-time jobs and route batches
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
              Courier-controlled package and food rate cards
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3">
              Direct support access from web and app
            </div>
          </div>
          <a
            href="https://gosenderr-6773f.web.app"
            className="mt-6 inline-flex items-center rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20"
          >
            Back to role selection
          </a>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white p-6 shadow-xl">
          <h2 className="text-2xl font-bold text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-600">Use your courier account credentials.</p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                placeholder="courier@example.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-[#2E68F8] to-[#5A35CF] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-4 text-sm text-slate-600">
            New courier?{" "}
            <Link to="/signup" className="font-semibold text-indigo-600 hover:text-indigo-700">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-white/70">© 2026 GoSenderr</p>
    </div>
  )
}

import { auth } from '../lib/firebase'
import { useNavigate } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { useAdmin } from '../hooks/useAdmin'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { isAdmin } = useAdmin()

  const handleSignOut = async () => {
    if (!window.confirm('Sign out of your account?')) return
    try {
      await auth.signOut()
      navigate('/login')
    } catch (error) {
      console.error('Error signing out:', error)
      alert('Failed to sign out')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">⚙️ Settings</h1>
          <p className="text-purple-100">{isAdmin ? 'Platform configuration' : 'Account settings'}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 space-y-4">
        {/* Account Actions */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={handleSignOut}
              className="w-full py-3 px-4 rounded-xl border-2 border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-all"
            >
              Sign Out
            </button>
          </CardContent>
        </Card>

        {/* Platform Info */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>About</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Version:</strong> 1.0.0</p>
              <p><strong>Platform:</strong> GoSenderr</p>
              {isAdmin && <p className="text-purple-600 font-semibold">👑 Administrator Access</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

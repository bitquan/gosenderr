import { useEffect, useState } from 'react'
import { collection, getDocs, doc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'

interface Admin {
  id: string
  email: string
  displayName?: string
  role: string
  createdAt: any
  admin?: boolean
}

interface SecuritySettings {
  twoFactorEnabled: boolean
  sessionTimeout: number
  maxLoginAttempts: number
  passwordMinLength: number
  requireStrongPassword: boolean
  ipWhitelist: string[]
  maintenanceMode: boolean
}

export default function SecuritySettingsPage() {
  const { user } = useAuth()
  const [admins, setAdmins] = useState<Admin[]>([])
  const [settings, setSettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    sessionTimeout: 3600,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireStrongPassword: true,
    ipWhitelist: [],
    maintenanceMode: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newIp, setNewIp] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load admins
      const usersSnap = await getDocs(collection(db, 'users'))
      const adminUsers = usersSnap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Admin))
        .filter(u => u.admin || u.role === 'admin')
      
      setAdmins(adminUsers)

      // Load security settings
      const settingsDoc = await getDocs(collection(db, 'platformSettings'))
      const securityDoc = settingsDoc.docs.find(d => d.id === 'security')
      if (securityDoc) {
        setSettings(securityDoc.data() as SecuritySettings)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    
    setSaving(true)
    try {
      await setDoc(doc(db, 'platformSettings', 'security'), settings)
      alert('Security settings saved successfully!')
    } catch (error) {
      console.error('Error saving security settings:', error)
      alert('Failed to save security settings')
    } finally {
      setSaving(false)
    }
  }

  const addIp = () => {
    if (!newIp.trim()) return
    setSettings({
      ...settings,
      ipWhitelist: [...settings.ipWhitelist, newIp.trim()]
    })
    setNewIp('')
  }

  const removeIp = (ip: string) => {
    setSettings({
      ...settings,
      ipWhitelist: settings.ipWhitelist.filter(i => i !== ip)
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading security settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🔒 Security Settings</h1>
          <p className="text-purple-100">Manage access control and security</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        {/* Admin Users */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Admin Users ({admins.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{admin.email}</p>
                    {admin.displayName && (
                      <p className="text-sm text-gray-600">{admin.displayName}</p>
                    )}
                  </div>
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                    Admin
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Authentication */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.twoFactorEnabled}
                    onChange={(e) => setSettings({...settings, twoFactorEnabled: e.target.checked})}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Require Two-Factor Authentication</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout (seconds)
                </label>
                <input
                  type="number"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Users will be logged out after {Math.floor(settings.sessionTimeout / 60)} minutes of inactivity
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Login Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.maxLoginAttempts}
                  onChange={(e) => setSettings({...settings, maxLoginAttempts: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Policy */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Password Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Password Length
                </label>
                <input
                  type="number"
                  min="6"
                  max="32"
                  value={settings.passwordMinLength}
                  onChange={(e) => setSettings({...settings, passwordMinLength: parseInt(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.requireStrongPassword}
                    onChange={(e) => setSettings({...settings, requireStrongPassword: e.target.checked})}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Require Strong Passwords (uppercase, lowercase, number, special character)
                  </span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IP Whitelist */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>IP Whitelist (Admin Access)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="192.168.1.1"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  onClick={addIp}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  Add IP
                </button>
              </div>

              {settings.ipWhitelist.length > 0 ? (
                <div className="space-y-2">
                  {settings.ipWhitelist.map((ip, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-mono">{ip}</span>
                      <button
                        onClick={() => removeIp(ip)}
                        className="text-red-600 hover:text-red-800 font-medium text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No IP restrictions (all IPs allowed)</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Mode */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Maintenance Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({...settings, maintenanceMode: e.target.checked})}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Enable Maintenance Mode (blocks non-admin access)
                </span>
              </label>
              {settings.maintenanceMode && (
                <div className="mt-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium">
                    ⚠️ Maintenance mode is enabled. Only admins can access the platform.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Saving...' : '💾 Save Security Settings'}
        </button>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { Link } from 'react-router-dom'

interface PlatformSettings {
  siteName: string
  supportEmail: string
  supportPhone: string
  commissionRate: number
  deliveryFee: {
    base: number
    perKm: number
    expressMultiplier: number
  }
  autoCancelTimeout: number
  notifications: {
    emailEnabled: boolean
    smsEnabled: boolean
    pushEnabled: boolean
  }
  features: {
    marketplaceEnabled: boolean
    packageRunnerEnabled: boolean
    expressDeliveryEnabled: boolean
  }
}

const defaultSettings: PlatformSettings = {
  siteName: 'GoSenderr',
  supportEmail: 'support@gosenderr.com',
  supportPhone: '+1-555-0100',
  commissionRate: 15,
  deliveryFee: {
    base: 5,
    perKm: 1.5,
    expressMultiplier: 2
  },
  autoCancelTimeout: 30,
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true
  },
  features: {
    marketplaceEnabled: true,
    packageRunnerEnabled: true,
    expressDeliveryEnabled: true
  }
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'platformSettings', 'main')
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        setSettings({ ...defaultSettings, ...docSnap.data() })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await setDoc(doc(db, 'platformSettings', 'main'), settings)
      alert('Settings saved successfully')
      setHasChanges(false)
    } catch (error: any) {
      console.error('Error saving settings:', error)
      alert(`Failed to save: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (path: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev }
      const keys = path.split('.')
      let current: any = newSettings
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      setHasChanges(true)
      return newSettings
    })
  }

  const handleSignOut = async () => {
    if (!window.confirm('Sign out of admin account?')) return
    try {
      await auth.signOut()
    } catch (error) {
      console.error('Error signing out:', error)
      alert('Failed to sign out')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <p className="text-gray-600">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
          >
            <span className="mr-2">←</span>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">⚙️ Platform Settings</h1>
          <p className="text-purple-100">Configure platform-wide options</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        {/* Save Button */}
        {hasChanges && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <p className="text-sm font-semibold text-yellow-800">You have unsaved changes</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {/* General Settings */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>🏢 General Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => updateSetting('siteName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Support Email</label>
                <input
                  type="email"
                  value={settings.supportEmail}
                  onChange={(e) => updateSetting('supportEmail', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Support Phone</label>
                <input
                  type="tel"
                  value={settings.supportPhone}
                  onChange={(e) => updateSetting('supportPhone', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Configuration */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>💰 Pricing & Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform Commission Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.commissionRate}
                  onChange={(e) => updateSetting('commissionRate', parseFloat(e.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Currently: {settings.commissionRate}% of each transaction
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Delivery Fee ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={settings.deliveryFee.base}
                    onChange={(e) => updateSetting('deliveryFee.base', parseFloat(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Per Kilometer ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={settings.deliveryFee.perKm}
                    onChange={(e) => updateSetting('deliveryFee.perKm', parseFloat(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Express Multiplier (x)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={settings.deliveryFee.expressMultiplier}
                    onChange={(e) => updateSetting('deliveryFee.expressMultiplier', parseFloat(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Job Settings */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>📦 Job Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Auto-Cancel Timeout (minutes)
              </label>
              <input
                type="number"
                min="5"
                step="5"
                value={settings.autoCancelTimeout}
                onChange={(e) => updateSetting('autoCancelTimeout', parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Jobs will auto-cancel if no courier accepts within this time
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>🔔 Notification Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                <div>
                  <p className="font-semibold text-gray-900">Email Notifications</p>
                  <p className="text-sm text-gray-600">Send emails for important events</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.emailEnabled}
                  onChange={(e) => updateSetting('notifications.emailEnabled', e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                <div>
                  <p className="font-semibold text-gray-900">SMS Notifications</p>
                  <p className="text-sm text-gray-600">Send text messages for urgent updates</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.smsEnabled}
                  onChange={(e) => updateSetting('notifications.smsEnabled', e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                <div>
                  <p className="font-semibold text-gray-900">Push Notifications</p>
                  <p className="text-sm text-gray-600">Send push notifications to mobile apps</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications.pushEnabled}
                  onChange={(e) => updateSetting('notifications.pushEnabled', e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Feature Toggles */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>🎛️ Feature Toggles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                <div>
                  <p className="font-semibold text-gray-900">Marketplace</p>
                  <p className="text-sm text-gray-600">Enable vendor marketplace features</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.features.marketplaceEnabled}
                  onChange={(e) => updateSetting('features.marketplaceEnabled', e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                <div>
                  <p className="font-semibold text-gray-900">Package Runner</p>
                  <p className="text-sm text-gray-600">Enable long-distance package delivery</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.features.packageRunnerEnabled}
                  onChange={(e) => updateSetting('features.packageRunnerEnabled', e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer">
                <div>
                  <p className="font-semibold text-gray-900">Express Delivery</p>
                  <p className="text-sm text-gray-600">Enable express/priority delivery options</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.features.expressDeliveryEnabled}
                  onChange={(e) => updateSetting('features.expressDeliveryEnabled', e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                />
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>👤 Account</CardTitle>
          </CardHeader>
          <CardContent>
            <button
              onClick={handleSignOut}
              className="w-full py-3 px-4 rounded-xl border-2 border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-all"
            >
              Sign Out
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

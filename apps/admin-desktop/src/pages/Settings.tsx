import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc, Timestamp, addDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { seedFeatureFlags } from '../lib/seedData'

interface Setting {
  id: string
  group: string
  key: string
  value: any
  label: string
  description?: string
  type: 'string' | 'number' | 'boolean' | 'object'
  updatedAt?: any
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [editingValues, setEditingValues] = useState<Record<string, any>>({})

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'platformSettings'))
      const settingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Setting))
      
      setSettings(settingsData)
      
      // Initialize editing values
      const initialValues: Record<string, any> = {}
      settingsData.forEach(setting => {
        initialValues[setting.id] = setting.value
      })
      setEditingValues(initialValues)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (settingId: string) => {
    setSaving(settingId)
    try {
      const newValue = editingValues[settingId]
      
      await updateDoc(doc(db, 'platformSettings', settingId), {
        value: newValue,
        updatedAt: Timestamp.now()
      })

      // Log admin action
      await addDoc(collection(db, 'adminLogs'), {
        action: 'setting_updated',
        settingId,
        timestamp: Timestamp.now(),
        adminEmail: 'admin@example.com' // TODO: get from auth
      })

      await loadSettings()
      alert('Setting saved successfully')
    } catch (error) {
      console.error('Error saving setting:', error)
      alert('Failed to save setting')
    } finally {
      setSaving(null)
    }
  }

  const handleValueChange = (settingId: string, value: any, type: string) => {
    let parsedValue = value
    
    if (type === 'number') {
      parsedValue = parseFloat(value) || 0
    } else if (type === 'boolean') {
      parsedValue = value === 'true' || value === true
    }
    
    setEditingValues(prev => ({
      ...prev,
      [settingId]: parsedValue
    }))
  }

  const handleSeedFeatureFlags = async () => {
    if (!confirm('This will create/overwrite the feature flags configuration. Continue?')) {
      return;
    }
    
    try {
      await seedFeatureFlags();
      alert('✅ Feature flags seeded successfully!');
    } catch (error) {
      alert('❌ Failed to seed feature flags: ' + (error as Error).message);
    }
  }

  const renderValueInput = (setting: Setting) => {
    const value = editingValues[setting.id]
    
    if (setting.type === 'boolean') {
      return (
        <select
          value={value ? 'true' : 'false'}
          onChange={(e) => handleValueChange(setting.id, e.target.value, setting.type)}
          className="flex-1 p-2 border rounded"
        >
          <option value="true">Enabled</option>
          <option value="false">Disabled</option>
        </select>
      )
    }
    
    if (setting.type === 'number') {
      return (
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(e) => handleValueChange(setting.id, e.target.value, setting.type)}
          className="flex-1 p-2 border rounded"
        />
      )
    }
    
    if (setting.type === 'string') {
      return (
        <input
          type="text"
          value={value}
          onChange={(e) => handleValueChange(setting.id, e.target.value, setting.type)}
          className="flex-1 p-2 border rounded"
        />
      )
    }
    
    // For objects, show JSON
    return (
      <textarea
        value={JSON.stringify(value, null, 2)}
        onChange={(e) => {
          try {
            const parsed = JSON.parse(e.target.value)
            handleValueChange(setting.id, parsed, setting.type)
          } catch (err) {
            // Invalid JSON, don't update
          }
        }}
        className="flex-1 p-2 border rounded font-mono text-sm"
        rows={4}
      />
    )
  }

  const groupedSettings = settings.reduce((acc, setting) => {
    if (!acc[setting.group]) {
      acc[setting.group] = []
    }
    acc[setting.group].push(setting)
    return acc
  }, {} as Record<string, Setting[]>)

  const groupLabels: Record<string, string> = {
    general: 'General Settings',
    marketplace: 'Marketplace Settings',
    payments: 'Payment Settings',
    delivery: 'Delivery Settings',
    notifications: 'Notification Settings'
  }

  const groupIcons: Record<string, string> = {
    general: '⚙️',
    marketplace: '🛒',
    payments: '💳',
    delivery: '🚚',
    notifications: '🔔'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
        <p className="text-gray-600 mt-2">Configure platform-wide settings and preferences</p>
      </div>

      {/* Quick Links to Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Advanced Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Link 
              to="/settings/payment" 
              className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-xl hover:shadow-lg transition-all text-center"
            >
              <div className="text-4xl mb-2">💳</div>
              <h3 className="font-bold text-gray-900">Payment Settings</h3>
              <p className="text-sm text-gray-600 mt-1">Stripe, fees, payouts</p>
            </Link>

            <Link 
              to="/settings/email" 
              className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl hover:shadow-lg transition-all text-center"
            >
              <div className="text-4xl mb-2">📧</div>
              <h3 className="font-bold text-gray-900">Email Settings</h3>
              <p className="text-sm text-gray-600 mt-1">SMTP, templates</p>
            </Link>

            <Link 
              to="/settings/security" 
              className="p-4 bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-xl hover:shadow-lg transition-all text-center"
            >
              <div className="text-4xl mb-2">🔒</div>
              <h3 className="font-bold text-gray-900">Security</h3>
              <p className="text-sm text-gray-600 mt-1">Access control, admins</p>
            </Link>
            <Link 
              to="/secrets" 
              className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-emerald-200 rounded-xl hover:shadow-lg transition-all text-center"
            >
              <div className="text-4xl mb-2">🔑</div>
              <h3 className="font-bold text-gray-900">Stripe Keys</h3>
              <p className="text-sm text-gray-600 mt-1">Publishable/secret keys</p>
            </Link>
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3">🛠️ Quick Actions</h4>
            <div className="flex gap-3">
              <button
                onClick={handleSeedFeatureFlags}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                🎚️ Seed Feature Flags
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Initialize or reset feature flags configuration for all apps
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Settings Groups */}
      <div className="space-y-6">
        {Object.entries(groupedSettings).map(([group, groupSettings]) => (
          <Card key={group}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-2xl">{groupIcons[group] || '📋'}</span>
                {groupLabels[group] || group}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groupSettings.map(setting => (
                  <div key={setting.id} className="border-b pb-4 last:border-b-0">
                    <div className="mb-2">
                      <label className="block font-semibold text-gray-900">
                        {setting.label}
                      </label>
                      {setting.description && (
                        <p className="text-sm text-gray-500">{setting.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {renderValueInput(setting)}
                      
                      <button
                        onClick={() => handleSave(setting.id)}
                        disabled={saving === setting.id || editingValues[setting.id] === setting.value}
                        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {saving === setting.id ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                    
                    {setting.updatedAt && (
                      <p className="text-xs text-gray-400 mt-2">
                        Last updated: {setting.updatedAt.toDate?.()?.toLocaleString() || 'Unknown'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {settings.length === 0 && (
        <Card>
          <CardContent>
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">⚙️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Settings Found</h3>
              <p className="text-gray-600">
                Platform settings have not been configured yet.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

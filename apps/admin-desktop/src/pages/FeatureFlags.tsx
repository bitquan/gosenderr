import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc, addDoc, setDoc, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { useFeatureFlags } from '../hooks/useFeatureFlags'

interface FeatureFlag {
  id: string
  name: string
  description: string
  enabled: boolean
  category: string
  createdAt?: any
  updatedAt?: any
}

export default function FeatureFlagsPage() {
  const { user } = useAuth()
  const { flags: configFlags, loading: configLoading } = useFeatureFlags()
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newFlag, setNewFlag] = useState({
    name: '',
    description: '',
    category: 'system',
    enabled: false
  })

  useEffect(() => {
    loadFlags()
  }, [])

  const loadFlags = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'featureFlags'))
      const flagsData = snapshot.docs
        .filter(doc => doc.id !== 'config') // Skip the config document
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        } as FeatureFlag))
        .filter(flag => flag.name && flag.category) // Only include valid flags
      
      // Sort by category then name
      flagsData.sort((a, b) => {
        if (a.category === b.category) {
          return a.name.localeCompare(b.name)
        }
        return a.category.localeCompare(b.category)
      })
      
      setFlags(flagsData)
    } catch (error) {
      console.error('Error loading feature flags:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFlag = async (flagId: string, currentValue: boolean) => {
    setUpdating(flagId)
    try {
      await updateDoc(doc(db, 'featureFlags', flagId), {
        enabled: !currentValue,
        updatedAt: Timestamp.now()
      })

      // Update local state
      setFlags(flags.map(flag => 
        flag.id === flagId ? { ...flag, enabled: !currentValue } : flag
      ))

      console.log(`Feature flag ${flagId} ${!currentValue ? 'enabled' : 'disabled'}`)
    } catch (error) {
      console.error('Error toggling feature flag:', error)
      alert('Failed to update feature flag')
    } finally {
      setUpdating(null)
    }
  }

  const handleAddFlag = async () => {
    if (!newFlag.name || !newFlag.description) {
      alert('Please fill in all fields')
      return
    }

    try {
      await addDoc(collection(db, 'featureFlags'), {
        ...newFlag,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      })

      // Reset form and close modal
      setNewFlag({ name: '', description: '', category: 'system', enabled: false })
      setShowAddModal(false)
      
      // Reload flags
      await loadFlags()
      
      alert('✅ Feature flag added successfully!')
    } catch (error) {
      console.error('Error adding feature flag:', error)
      alert('Failed to add feature flag')
    }
  }

  // Group flags by category
  const flagsByCategory = (flags || []).reduce((acc, flag) => {
    if (!acc[flag.category]) {
      acc[flag.category] = []
    }
    acc[flag.category].push(flag)
    return acc
  }, {} as Record<string, FeatureFlag[]>)

  const categoryIcons: Record<string, string> = {
    marketplace: '🛒',
    delivery: '🚚',
    payments: '💳',
    notifications: '🔔',
    system: '⚙️'
  }

  const handleToggleWebPortal = async (currentValue: boolean) => {
    try {
      await setDoc(
        doc(db, 'featureFlags', 'config'),
        { admin: { webPortalEnabled: !currentValue } },
        { merge: true }
      )
    } catch (error) {
      console.error('Error updating admin web portal flag:', error)
      alert('Failed to update admin web portal access')
    }
  }

  const handleToggleCourierOffers = async (currentValue: boolean) => {
    try {
      await setDoc(
        doc(db, 'featureFlags', 'config'),
        { marketplace: { courierOffers: !currentValue } },
        { merge: true }
      )
    } catch (error) {
      console.error('Error updating courier offers flag:', error)
      alert('Failed to update courier offers')
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">🎚️ Feature Flags</h1>
            <p className="text-purple-100">Enable or disable platform features</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 bg-white text-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition-all shadow-lg"
          >
            + Add New Flag
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Admin Web Portal Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Enable Web Admin Portal</p>
                <p className="text-xs text-gray-500">Turn on to allow access to the web admin portal.</p>
              </div>
              <button
                type="button"
                disabled={configLoading}
                onClick={() => handleToggleWebPortal(Boolean(configFlags?.admin?.webPortalEnabled))}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  configFlags?.admin?.webPortalEnabled
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {configFlags?.admin?.webPortalEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Marketplace Courier Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900">Enable Courier Offers</p>
                <p className="text-xs text-gray-500">Show courier offer cards during checkout.</p>
              </div>
              <button
                type="button"
                disabled={configLoading}
                onClick={() => handleToggleCourierOffers(Boolean(configFlags?.marketplace?.courierOffers))}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  configFlags?.marketplace?.courierOffers
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {configFlags?.marketplace?.courierOffers ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          </CardContent>
        </Card>
        {loading ? (
          <Card variant="elevated">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading feature flags...</p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(flagsByCategory).map(([category, categoryFlags]) => (
            <Card key={category} variant="elevated">
              <CardHeader>
                <CardTitle>
                  {categoryIcons[category] || '📋'} {category.charAt(0).toUpperCase() + category.slice(1)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryFlags.map(flag => (
                    <div
                      key={flag.id}
                      className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:border-purple-200 transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{flag.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">{flag.description}</p>
                      </div>

                      <button
                        onClick={() => toggleFlag(flag.id, flag.enabled)}
                        disabled={updating === flag.id}
                        className={`
                          relative inline-flex h-8 w-16 items-center rounded-full transition-colors
                          ${flag.enabled ? 'bg-green-500' : 'bg-gray-300'}
                          ${updating === flag.id ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                        `}
                      >
                        <span
                          className={`
                            inline-block h-6 w-6 transform rounded-full bg-white transition-transform
                            ${flag.enabled ? 'translate-x-9' : 'translate-x-1'}
                          `}
                        />
                      </button>

                      <div className="ml-4 text-right">
                        <span
                          className={`
                            inline-block px-3 py-1 rounded-full text-sm font-medium
                            ${flag.enabled 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                            }
                          `}
                        >
                          {flag.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {!loading && flags.length === 0 && (
          <Card variant="elevated">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🎚️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Feature Flags</h3>
              <p className="text-gray-600">No feature flags have been configured yet.</p>
            </CardContent>
          </Card>
        )}

        {/* Warning banner */}
        <Card variant="elevated">
          <CardContent className="p-4">
            <div className="flex items-start gap-3 text-amber-800 bg-amber-50 p-4 rounded-lg">
              <div className="text-2xl">⚠️</div>
              <div>
                <h4 className="font-semibold mb-1">Caution</h4>

      {/* Add Flag Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-6">Add New Feature Flag</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feature Name *
                </label>
                <input
                  type="text"
                  value={newFlag.name}
                  onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="e.g., Advanced Analytics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={newFlag.description}
                  onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                  placeholder="Describe what this flag controls..."
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={newFlag.category}
                  onChange={(e) => setNewFlag({ ...newFlag, category: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
                >
                  <option value="marketplace">Marketplace</option>
                  <option value="delivery">Delivery</option>
                  <option value="payments">Payments</option>
                  <option value="notifications">Notifications</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Initial State
                  </label>
                  <p className="text-xs text-gray-500">Enable by default?</p>
                </div>
                <button
                  onClick={() => setNewFlag({ ...newFlag, enabled: !newFlag.enabled })}
                  className={`
                    relative inline-flex h-8 w-16 items-center rounded-full transition-colors
                    ${newFlag.enabled ? 'bg-green-500' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      inline-block h-6 w-6 transform rounded-full bg-white transition-transform
                      ${newFlag.enabled ? 'translate-x-9' : 'translate-x-1'}
                    `}
                  />
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFlag}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all"
              >
                Add Flag
              </button>
            </div>
          </div>
        </div>
      )}
                <p className="text-sm">
                  Changing feature flags affects all users immediately. Be careful when disabling critical features like payments or marketplace functionality.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

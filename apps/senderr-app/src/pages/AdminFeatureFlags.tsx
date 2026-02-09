import { useEffect, useState } from 'react'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { Link } from 'react-router-dom'

interface FeatureFlags {
  marketplace: {
    enabled: boolean
    itemListings: boolean
    combinedPayments: boolean
  }
  delivery: {
    onDemand: boolean
    routes: boolean
    longRoutes: boolean
    longHaul: boolean
    mapShell: boolean
  }
  courier: {
    rateCards: boolean
    equipmentBadges: boolean
    workModes: boolean
  }
  seller: {
    stripeConnect: boolean
    multiplePhotos: boolean
    foodListings: boolean
  }
  customer: {
    liveTracking: boolean
    proofPhotos: boolean
    routeDelivery: boolean
    packageShipping: boolean
  }
  packageRunner: {
    enabled: boolean
    hubNetwork: boolean
    packageTracking: boolean
  }
  admin: {
    courierApproval: boolean
    equipmentReview: boolean
    disputeManagement: boolean
    analytics: boolean
    featureFlagsControl: boolean
  }
  advanced: {
    pushNotifications: boolean
    ratingEnforcement: boolean
    autoCancel: boolean
    refunds: boolean
  }
  ui: {
    modernStyling: boolean
    darkMode: boolean
    animations: boolean
  }
}

export default function AdminFeatureFlagsPage() {
  const [flags, setFlags] = useState<FeatureFlags | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editedFlags, setEditedFlags] = useState<FeatureFlags | null>(null)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'featureFlags', 'config'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as FeatureFlags
          setFlags(data)
          setEditedFlags(data)
        }
        setLoading(false)
      },
      (error) => {
        console.error('Error loading feature flags:', error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  const handleToggle = (category: keyof FeatureFlags, flag: string) => {
    if (!editedFlags) return
    
    setEditedFlags({
      ...editedFlags,
      [category]: {
        ...editedFlags[category],
        [flag]: !(editedFlags[category] as any)[flag]
      }
    })
  }

  const handleSave = async () => {
    if (!editedFlags) return

    setSaving(true)
    try {
      await updateDoc(doc(db, 'featureFlags', 'config'), editedFlags as any)
      alert('✅ Feature flags saved successfully!')
    } catch (error) {
      console.error('Error saving flags:', error)
      alert('Failed to save feature flags')
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = JSON.stringify(flags) !== JSON.stringify(editedFlags)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <p className="text-gray-600">Loading feature flags...</p>
      </div>
    )
  }

  if (!editedFlags) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <p className="text-gray-600">Feature flags not found</p>
      </div>
    )
  }

  const categories = [
    { key: 'marketplace', title: '🛒 Marketplace', icon: '🛒' },
    { key: 'delivery', title: '🚚 Delivery', icon: '🚚' },
    { key: 'courier', title: '⚡ Courier', icon: '⚡' },
    { key: 'seller', title: '🏪 Seller', icon: '🏪' },
    { key: 'customer', title: '📦 Customer', icon: '📦' },
    { key: 'packageRunner', title: '🚛 Package Runners', icon: '🚛' },
    { key: 'admin', title: '🔧 Admin', icon: '🔧' },
    { key: 'advanced', title: '⚙️ Advanced', icon: '⚙️' },
    { key: 'ui', title: '🎨 UI', icon: '🎨' }
  ]

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
          >
            <span className="mr-2">←</span>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">🎚️ Feature Flags</h1>
          <p className="text-purple-100">Platform feature configuration</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Save Banner */}
        {hasChanges && (
          <Card variant="elevated">
            <CardContent className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
              <div className="flex items-center justify-between">
                <p className="text-yellow-900 font-semibold">⚠️ You have unsaved changes</p>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Feature Categories */}
        {categories.map(({ key, title, icon }) => {
          const categoryFlags = editedFlags[key as keyof FeatureFlags] as Record<string, boolean>
          
          return (
            <Card key={key} variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span>{icon}</span>
                  <span>{title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(categoryFlags).map(([flagKey, flagValue]) => (
                    <div
                      key={flagKey}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div>
                        <p className="font-semibold text-gray-900 capitalize">
                          {flagKey.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {key}.{flagKey}
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggle(key as keyof FeatureFlags, flagKey)}
                        className={`relative w-14 h-7 rounded-full transition-colors ${
                          flagValue ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                            flagValue ? 'translate-x-8' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Bottom Save Button */}
        {hasChanges && (
          <Card variant="elevated">
            <CardContent className="p-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 px-4 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-all disabled:opacity-50"
              >
                {saving ? 'Saving Changes...' : 'Save All Changes'}
              </button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'

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
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    loadFlags()
  }, [])

  const loadFlags = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'featureFlags'))
      const flagsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FeatureFlag))
      
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

  // Group flags by category
  const flagsByCategory = flags.reduce((acc, flag) => {
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

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🎚️ Feature Flags</h1>
          <p className="text-purple-100">Enable or disable platform features</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
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

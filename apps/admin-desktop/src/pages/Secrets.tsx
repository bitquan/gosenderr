import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'
import { useToast } from '../components/ToastProvider'

interface StripeSecrets {
  publishableKey: string
  secretKey: string
  livePublishableKey?: string
  liveSecretKey?: string
  webhookSecret: string
  liveWebhookSecret?: string
  mode: 'test' | 'live'
  updatedAt?: any
  updatedByEmail?: string
}

interface MapboxSecrets {
  publicToken: string
  updatedAt?: any
  updatedByEmail?: string
}

export default function SecretsPage() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [showWebhook, setShowWebhook] = useState(false)
  const [secrets, setSecrets] = useState<StripeSecrets>({
    publishableKey: '',
    secretKey: '',
    livePublishableKey: '',
    liveSecretKey: '',
    webhookSecret: '',
    liveWebhookSecret: '',
    mode: 'test',
  })
  const [mapbox, setMapbox] = useState<MapboxSecrets>({
    publicToken: '',
  })

  useEffect(() => {
    loadSecrets()
  }, [])

  const loadSecrets = async () => {
    try {
      const docRef = doc(db, 'secrets', 'stripe')
      const docSnap = await getDoc(docRef)
      if (docSnap.exists()) {
        const data = docSnap.data() as StripeSecrets
        setSecrets({
          publishableKey: data.publishableKey || '',
          secretKey: data.secretKey || '',
          livePublishableKey: data.livePublishableKey || '',
          liveSecretKey: data.liveSecretKey || '',
          webhookSecret: data.webhookSecret || '',
          liveWebhookSecret: data.liveWebhookSecret || '',
          mode: data.mode || 'test',
          updatedAt: data.updatedAt,
          updatedByEmail: data.updatedByEmail,
        })
      }

      const mapboxRef = doc(db, 'secrets', 'mapbox')
      const mapboxSnap = await getDoc(mapboxRef)
      if (mapboxSnap.exists()) {
        const data = mapboxSnap.data() as MapboxSecrets
        setMapbox({
          publicToken: data.publicToken || '',
          updatedAt: data.updatedAt,
          updatedByEmail: data.updatedByEmail,
        })
      }
    } catch (error) {
      console.error('Error loading secrets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      await setDoc(
        doc(db, 'secrets', 'stripe'),
        {
          publishableKey: secrets.publishableKey,
          secretKey: secrets.secretKey,
          livePublishableKey: secrets.livePublishableKey || '',
          liveSecretKey: secrets.liveSecretKey || '',
          webhookSecret: secrets.webhookSecret,
          liveWebhookSecret: secrets.liveWebhookSecret || '',
          mode: secrets.mode,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
          updatedByEmail: user.email || '',
        },
        { merge: true }
      )

      await setDoc(
        doc(db, 'secrets', 'mapbox'),
        {
          publicToken: mapbox.publicToken,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
          updatedByEmail: user.email || '',
        },
        { merge: true }
      )

      showToast('Secrets saved', 'success')
    } catch (error) {
      console.error('Error saving secrets:', error)
      showToast('Failed to save Stripe secrets', 'error')
    } finally {
      setSaving(false)
    }
  }

  const lastUpdated = secrets.updatedAt?.toDate ? secrets.updatedAt.toDate() : null
  const mapboxUpdated = mapbox.updatedAt?.toDate ? mapbox.updatedAt.toDate() : null
  const hasTestPublishable = !!secrets.publishableKey?.trim()
  const hasTestSecret = !!secrets.secretKey?.trim()
  const hasTestWebhook = !!secrets.webhookSecret?.trim()
  const hasLivePublishable = !!secrets.livePublishableKey?.trim()
  const hasLiveSecret = !!secrets.liveSecretKey?.trim()
  const hasLiveWebhook = !!secrets.liveWebhookSecret?.trim()
  const hasTestKeys = hasTestPublishable && hasTestSecret && hasTestWebhook
  const hasLiveKeys = hasLivePublishable && hasLiveSecret && hasLiveWebhook
  const configuredMode = secrets.mode || 'test'
  const effectiveMode = configuredMode === 'live' && hasLiveKeys ? 'live' : 'test'
  const isFallback = configuredMode === 'live' && !hasLiveKeys && hasTestKeys
  const isError = effectiveMode === 'live' ? !hasLiveKeys : !hasTestKeys
  const statusLabel = isError
    ? 'Missing keys'
    : effectiveMode === 'live'
      ? 'Live active'
      : isFallback
        ? 'Test active (fallback)'
        : 'Test active'
  const statusClass = isError
    ? 'bg-red-100 text-red-700 border-red-200'
    : effectiveMode === 'live'
      ? 'bg-green-100 text-green-700 border-green-200'
      : 'bg-blue-100 text-blue-700 border-blue-200'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading secrets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">🔑 Secrets Manager</h1>
          <p className="text-purple-100">Manage Stripe keys and webhook secrets securely</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Stripe Environment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
                <select
                  value={secrets.mode}
                  onChange={(e) => setSecrets({ ...secrets, mode: e.target.value as 'test' | 'live' })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="test">Test</option>
                  <option value="live">Live</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Use Test keys for development and Live keys for production.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${statusClass}`}>
                  {statusLabel}
                </span>
                <span className="text-xs text-gray-500">Configured: {configuredMode}</span>
              </div>
              {lastUpdated && (
                <div className="text-xs text-gray-500">
                  Last updated {lastUpdated.toLocaleString()} {secrets.updatedByEmail ? `by ${secrets.updatedByEmail}` : ''}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Stripe Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                <div className="text-sm font-semibold text-gray-700">Test Keys</div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Publishable Key</label>
                  <input
                    type="text"
                    value={secrets.publishableKey}
                    onChange={(e) => setSecrets({ ...secrets, publishableKey: e.target.value })}
                    placeholder="pk_test_..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used by clients to initialize Stripe in test mode.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
                  <div className="flex gap-2">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={secrets.secretKey}
                      onChange={(e) => setSecrets({ ...secrets, secretKey: e.target.value })}
                      placeholder="sk_test_..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {showSecret ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Never share this key publicly.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Secret</label>
                  <div className="flex gap-2">
                    <input
                      type={showWebhook ? 'text' : 'password'}
                      value={secrets.webhookSecret}
                      onChange={(e) => setSecrets({ ...secrets, webhookSecret: e.target.value })}
                      placeholder="whsec_..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWebhook(!showWebhook)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {showWebhook ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Used to verify test webhook signatures.</p>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-4">
                <div className="text-sm font-semibold text-gray-700">Live Keys</div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Publishable Key</label>
                  <input
                    type="text"
                    value={secrets.livePublishableKey}
                    onChange={(e) => setSecrets({ ...secrets, livePublishableKey: e.target.value })}
                    placeholder="pk_live_..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used by clients to initialize Stripe in live mode.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
                  <div className="flex gap-2">
                    <input
                      type={showSecret ? 'text' : 'password'}
                      value={secrets.liveSecretKey}
                      onChange={(e) => setSecrets({ ...secrets, liveSecretKey: e.target.value })}
                      placeholder="sk_live_..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSecret(!showSecret)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {showSecret ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Never share this key publicly.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Webhook Secret</label>
                  <div className="flex gap-2">
                    <input
                      type={showWebhook ? 'text' : 'password'}
                      value={secrets.liveWebhookSecret}
                      onChange={(e) => setSecrets({ ...secrets, liveWebhookSecret: e.target.value })}
                      placeholder="whsec_..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWebhook(!showWebhook)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {showWebhook ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Used to verify live webhook signatures.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Mapbox</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Public Token</label>
                <input
                  type="text"
                  value={mapbox.publicToken}
                  onChange={(e) => setMapbox({ ...mapbox, publicToken: e.target.value })}
                  placeholder="pk.eyJ..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">Used for map previews and address search.</p>
              </div>
              {mapboxUpdated && (
                <div className="text-xs text-gray-500">
                  Last updated {mapboxUpdated.toLocaleString()} {mapbox.updatedByEmail ? `by ${mapbox.updatedByEmail}` : ''}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold shadow-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Secrets'}
          </button>
        </div>
      </div>
    </div>
  )
}

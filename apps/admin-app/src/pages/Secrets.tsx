import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '../components/Card'

interface StripeSecrets {
  publishableKey: string
  secretKey: string
  webhookSecret: string
  mode: 'test' | 'live'
  updatedAt?: any
  updatedByEmail?: string
}

export default function SecretsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [showWebhook, setShowWebhook] = useState(false)
  const [secrets, setSecrets] = useState<StripeSecrets>({
    publishableKey: '',
    secretKey: '',
    webhookSecret: '',
    mode: 'test',
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
          webhookSecret: data.webhookSecret || '',
          mode: data.mode || 'test',
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
          webhookSecret: secrets.webhookSecret,
          mode: secrets.mode,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
          updatedByEmail: user.email || '',
        },
        { merge: true }
      )
      alert('Stripe secrets saved successfully')
    } catch (error) {
      console.error('Error saving secrets:', error)
      alert('Failed to save Stripe secrets')
    } finally {
      setSaving(false)
    }
  }

  const lastUpdated = secrets.updatedAt?.toDate ? secrets.updatedAt.toDate() : null

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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Publishable Key</label>
                <input
                  type="text"
                  value={secrets.publishableKey}
                  onChange={(e) => setSecrets({ ...secrets, publishableKey: e.target.value })}
                  placeholder="pk_..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">Used by clients to initialize Stripe.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Secret Key</label>
                <div className="flex gap-2">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    value={secrets.secretKey}
                    onChange={(e) => setSecrets({ ...secrets, secretKey: e.target.value })}
                    placeholder="sk_..."
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
                <p className="text-xs text-gray-500 mt-1">Used to verify Stripe webhook signatures.</p>
              </div>
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

import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'

interface PaymentSettings {
  stripePublishableKey: string
  stripeSecretKey: string
  platformCommissionRate: number
  platformFeePackage: number
  platformFeeFood: number
  vendorPayoutSchedule: 'daily' | 'weekly' | 'monthly'
  minimumPayoutAmount: number
  autoPayouts: boolean
  paymentMethods: {
    card: boolean
    applePay: boolean
    googlePay: boolean
  }
  currency: string
  taxRate: number
  collectTax: boolean
}

export default function PaymentSettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<PaymentSettings>({
    stripePublishableKey: '',
    stripeSecretKey: '',
    platformCommissionRate: 10,
    platformFeePackage: 2.5,
    platformFeeFood: 1.5,
    vendorPayoutSchedule: 'weekly',
    minimumPayoutAmount: 50,
    autoPayouts: true,
    paymentMethods: {
      card: true,
      applePay: true,
      googlePay: true
    },
    currency: 'USD',
    taxRate: 0,
    collectTax: false
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const [paymentSnap, secretsSnap] = await Promise.all([
        getDoc(doc(db, 'platformSettings', 'payment')),
        getDoc(doc(db, 'secrets', 'stripe'))
      ])

      const paymentData = paymentSnap.exists() ? (paymentSnap.data() as Partial<PaymentSettings>) : {}
      const secretsData = secretsSnap.exists()
        ? (secretsSnap.data() as { publishableKey?: string; secretKey?: string })
        : {}

      setSettings((prev) => ({
        ...prev,
        ...paymentData,
        stripePublishableKey: secretsData.publishableKey || '',
        stripeSecretKey: secretsData.secretKey || ''
      }))
    } catch (error) {
      console.error('Error loading payment settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    
    setSaving(true)
    try {
      const { stripePublishableKey, stripeSecretKey, ...paymentSettings } = settings

      await Promise.all([
        setDoc(doc(db, 'platformSettings', 'payment'), paymentSettings, { merge: true }),
        setDoc(
          doc(db, 'secrets', 'stripe'),
          {
            publishableKey: stripePublishableKey,
            secretKey: stripeSecretKey,
            updatedAt: serverTimestamp(),
            updatedBy: user.uid,
            updatedByEmail: user.email || ''
          },
          { merge: true }
        )
      ])
      alert('Payment settings saved successfully!')
    } catch (error) {
      console.error('Error saving payment settings:', error)
      alert('Failed to save payment settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading payment settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">💳 Payment Settings</h1>
          <p className="text-purple-100">Configure payment processing and payouts</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 space-y-6">
        {/* Stripe Configuration */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Stripe Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Publishable Key
                </label>
                <input
                  type="text"
                  value={settings.stripePublishableKey}
                  onChange={(e) => setSettings({...settings, stripePublishableKey: e.target.value})}
                  placeholder="pk_..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">Stored in Secrets (single source of truth).</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secret Key
                </label>
                <input
                  type="password"
                  value={settings.stripeSecretKey}
                  onChange={(e) => setSettings({...settings, stripeSecretKey: e.target.value})}
                  placeholder="sk_..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">Keep this secret and secure</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commission & Fees */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Commission & Fees</CardTitle>
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
                  step="0.5"
                  value={settings.platformCommissionRate}
                  onChange={(e) => setSettings({...settings, platformCommissionRate: parseFloat(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Platform takes {settings.platformCommissionRate}% from each transaction
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform Fee (Packages)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={settings.platformFeePackage}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        platformFeePackage: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Fixed fee per package delivery</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform Fee (Food)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={settings.platformFeeFood}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        platformFeeFood: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Fixed fee per food delivery</p>
                </div>
              </div>
              
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.collectTax}
                    onChange={(e) => setSettings({...settings, collectTax: e.target.checked})}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Collect Sales Tax</span>
                </label>
              </div>

              {settings.collectTax && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={settings.taxRate}
                    onChange={(e) => setSettings({...settings, taxRate: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vendor Payouts */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Vendor Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payout Schedule
                </label>
                <select
                  value={settings.vendorPayoutSchedule}
                  onChange={(e) => setSettings({...settings, vendorPayoutSchedule: e.target.value as any})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Payout Amount ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="10"
                  value={settings.minimumPayoutAmount}
                  onChange={(e) => setSettings({...settings, minimumPayoutAmount: parseFloat(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Vendors must have at least ${settings.minimumPayoutAmount} to receive a payout
                </p>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.autoPayouts}
                    onChange={(e) => setSettings({...settings, autoPayouts: e.target.checked})}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Automatic Payouts</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Accepted Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.paymentMethods.card}
                  onChange={(e) => setSettings({
                    ...settings,
                    paymentMethods: {...settings.paymentMethods, card: e.target.checked}
                  })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">💳 Credit/Debit Cards</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.paymentMethods.applePay}
                  onChange={(e) => setSettings({
                    ...settings,
                    paymentMethods: {...settings.paymentMethods, applePay: e.target.checked}
                  })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700"> Apple Pay</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.paymentMethods.googlePay}
                  onChange={(e) => setSettings({
                    ...settings,
                    paymentMethods: {...settings.paymentMethods, googlePay: e.target.checked}
                  })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">🅖 Google Pay</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Currency */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Currency</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Platform Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({...settings, currency: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="AUD">AUD - Australian Dollar</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
        >
          {saving ? 'Saving...' : '💾 Save Payment Settings'}
        </button>
      </div>
    </div>
  )
}

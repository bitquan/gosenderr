import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'

interface PaymentSettings {
  platformCommissionRate: number
  sellerMonthlySubscriptionFee: number
  platformFeePackage: number
  platformFeeFood: number
  orderAdFeeEnabled: boolean
  orderAdFeeFlat: number
  deliveryBaseFee: number
  deliveryPerMileFee: number
  deliveryPerStopFee: number
  deliveryMinimumFee: number
  sellerPayoutSchedule: 'daily' | 'weekly' | 'monthly'
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
    platformCommissionRate: 10,
    sellerMonthlySubscriptionFee: 10,
    platformFeePackage: 2.5,
    platformFeeFood: 1.5,
    orderAdFeeEnabled: false,
    orderAdFeeFlat: 0,
    deliveryBaseFee: 3.99,
    deliveryPerMileFee: 0.85,
    deliveryPerStopFee: 0.65,
    deliveryMinimumFee: 4.99,
    sellerPayoutSchedule: 'weekly',
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

  const parseNumberInput = (value: string, fallback: number) => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return fallback
    return parsed
  }

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'platformSettings', 'payment')
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const raw = docSnap.data() as any
        setSettings({
          platformCommissionRate: raw.platformCommissionRate ?? 10,
          sellerMonthlySubscriptionFee: raw.sellerMonthlySubscriptionFee ?? 10,
          platformFeePackage: raw.platformFeePackage ?? 2.5,
          platformFeeFood: raw.platformFeeFood ?? 1.5,
          orderAdFeeEnabled: raw.orderAdFeeEnabled ?? raw.adFeeEnabled ?? false,
          orderAdFeeFlat: raw.orderAdFeeFlat ?? 0,
          deliveryBaseFee: raw.deliveryBaseFee ?? 3.99,
          deliveryPerMileFee: raw.deliveryPerMileFee ?? 0.85,
          deliveryPerStopFee: raw.deliveryPerStopFee ?? 0.65,
          deliveryMinimumFee: raw.deliveryMinimumFee ?? 4.99,
          sellerPayoutSchedule: raw.sellerPayoutSchedule ?? raw.vendorPayoutSchedule ?? 'weekly',
          minimumPayoutAmount: raw.minimumPayoutAmount ?? 50,
          autoPayouts: raw.autoPayouts ?? true,
          paymentMethods: raw.paymentMethods ?? { card: true, applePay: true, googlePay: true },
          currency: raw.currency ?? 'USD',
          taxRate: raw.taxRate ?? 0,
          collectTax: raw.collectTax ?? false
        })
      }
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
      await setDoc(
        doc(db, 'platformSettings', 'payment'),
        {
          ...settings,
          adFeeEnabled: settings.orderAdFeeEnabled,
          updatedAt: new Date().toISOString(),
          updatedBy: (user as any)?.uid || (user as any)?.email || 'admin',
        },
        { merge: true }
      )
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
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Stripe Keys</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-gray-600">
              Stripe keys are managed in the Secrets Manager. Go to Settings → Secrets to update
              publishable keys, secret keys, and webhook secrets.
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
                  onChange={(e) => setSettings({...settings, platformCommissionRate: parseNumberInput(e.target.value, settings.platformCommissionRate)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Platform takes {settings.platformCommissionRate}% from each transaction
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seller Monthly Fee ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={settings.sellerMonthlySubscriptionFee}
                    onChange={(e) => setSettings({...settings, sellerMonthlySubscriptionFee: parseNumberInput(e.target.value, settings.sellerMonthlySubscriptionFee)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Platform Fee (Package) ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={settings.platformFeePackage}
                    onChange={(e) => setSettings({...settings, platformFeePackage: parseNumberInput(e.target.value, settings.platformFeePackage)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform Fee (Food) ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.platformFeeFood}
                  onChange={(e) => setSettings({...settings, platformFeeFood: parseNumberInput(e.target.value, settings.platformFeeFood)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
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
                    onChange={(e) => setSettings({...settings, taxRate: parseNumberInput(e.target.value, settings.taxRate)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              <p className="text-xs text-gray-500">
                These values directly drive senderrplace checkout fee calculation.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Ad Fees */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Ad / Listing Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={settings.orderAdFeeEnabled}
                  onChange={(e) => setSettings({ ...settings, orderAdFeeEnabled: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Enable per-order ad fee</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ad Fee Amount ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.orderAdFeeFlat}
                  onChange={(e) => setSettings({ ...settings, orderAdFeeFlat: parseNumberInput(e.target.value, settings.orderAdFeeFlat) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={!settings.orderAdFeeEnabled}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Fee Policy */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Delivery Fee Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Fee ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.deliveryBaseFee}
                  onChange={(e) => setSettings({...settings, deliveryBaseFee: parseNumberInput(e.target.value, settings.deliveryBaseFee)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Per Mile ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.deliveryPerMileFee}
                  onChange={(e) => setSettings({...settings, deliveryPerMileFee: parseNumberInput(e.target.value, settings.deliveryPerMileFee)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Per Extra Stop ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.deliveryPerStopFee}
                  onChange={(e) => setSettings({...settings, deliveryPerStopFee: parseNumberInput(e.target.value, settings.deliveryPerStopFee)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Fee ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.deliveryMinimumFee}
                  onChange={(e) => setSettings({...settings, deliveryMinimumFee: parseNumberInput(e.target.value, settings.deliveryMinimumFee)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seller Payouts */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Seller Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payout Schedule
                </label>
                <select
                  value={settings.sellerPayoutSchedule}
                  onChange={(e) => setSettings({...settings, sellerPayoutSchedule: e.target.value as any})}
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
                  onChange={(e) => setSettings({...settings, minimumPayoutAmount: parseNumberInput(e.target.value, settings.minimumPayoutAmount)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Sellers must have at least ${settings.minimumPayoutAmount} to receive a payout
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

import { useEffect, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'

interface PaymentSettings {
  platformCommissionRate: number
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

interface TokenPolicySettings {
  enabled: boolean
  finalSale: boolean
  tokenValueUsd: number
  costs: {
    jobUnlockStandard: number
    jobUnlockPriority: number
    jobUnlockHeavy: number
    listingPublish: number
    cashFee: number
    adBoost24h: number
    adBoost7d: number
    adBoost30d: number
    adFeatured7d: number
  }
  packs: Array<{
    id: string
    name: string
    tokens: number
    priceUsd: number
    active: boolean
  }>
}

export default function PaymentSettingsPage() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<PaymentSettings>({
    platformCommissionRate: 10,
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
  const [tokenPolicy, setTokenPolicy] = useState<TokenPolicySettings>({
    enabled: true,
    finalSale: true,
    tokenValueUsd: 0.1,
    costs: {
      jobUnlockStandard: 1,
      jobUnlockPriority: 2,
      jobUnlockHeavy: 3,
      listingPublish: 2,
      cashFee: 1,
      adBoost24h: 5,
      adBoost7d: 25,
      adBoost30d: 80,
      adFeatured7d: 120
    },
    packs: [
      { id: 'starter_100', name: 'Starter 100', tokens: 100, priceUsd: 10, active: true },
      { id: 'pro_250', name: 'Pro 250', tokens: 250, priceUsd: 25, active: true },
      { id: 'growth_600', name: 'Growth 600', tokens: 600, priceUsd: 60, active: true }
    ]
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const docRef = doc(db, 'platformSettings', 'payment')
      const docSnap = await getDoc(docRef)
      
      if (docSnap.exists()) {
        const raw = docSnap.data() as any
        setSettings({
          platformCommissionRate: raw.platformCommissionRate ?? 10,
          sellerPayoutSchedule: raw.sellerPayoutSchedule ?? raw.vendorPayoutSchedule ?? 'weekly',
          minimumPayoutAmount: raw.minimumPayoutAmount ?? 50,
          autoPayouts: raw.autoPayouts ?? true,
          paymentMethods: raw.paymentMethods ?? { card: true, applePay: true, googlePay: true },
          currency: raw.currency ?? 'USD',
          taxRate: raw.taxRate ?? 0,
          collectTax: raw.collectTax ?? false
        })
      }

      const tokenDoc = await getDoc(doc(db, 'platformSettings', 'tokenPolicy'))
      if (tokenDoc.exists()) {
        const raw = tokenDoc.data() as any
        setTokenPolicy({
          enabled: raw.enabled ?? true,
          finalSale: raw.finalSale ?? true,
          tokenValueUsd: raw.tokenValueUsd ?? 0.1,
          costs: {
            jobUnlockStandard: raw.costs?.jobUnlockStandard ?? 1,
            jobUnlockPriority: raw.costs?.jobUnlockPriority ?? 2,
            jobUnlockHeavy: raw.costs?.jobUnlockHeavy ?? 3,
            listingPublish: raw.costs?.listingPublish ?? 2,
            cashFee: raw.costs?.cashFee ?? 1,
            adBoost24h: raw.costs?.adBoost24h ?? 5,
            adBoost7d: raw.costs?.adBoost7d ?? 25,
            adBoost30d: raw.costs?.adBoost30d ?? 80,
            adFeatured7d: raw.costs?.adFeatured7d ?? 120,
          },
          packs: Array.isArray(raw.packs) && raw.packs.length > 0
            ? raw.packs
            : [
                { id: 'starter_100', name: 'Starter 100', tokens: 100, priceUsd: 10, active: true },
                { id: 'pro_250', name: 'Pro 250', tokens: 250, priceUsd: 25, active: true },
                { id: 'growth_600', name: 'Growth 600', tokens: 600, priceUsd: 60, active: true }
              ]
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
      await setDoc(doc(db, 'platformSettings', 'payment'), settings)
      await setDoc(doc(db, 'platformSettings', 'tokenPolicy'), tokenPolicy)
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
                  onChange={(e) => setSettings({...settings, platformCommissionRate: parseFloat(e.target.value)})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Platform takes {settings.platformCommissionRate}% from each transaction
                </p>
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

        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Senderr Token Policy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tokenPolicy.enabled}
                  onChange={(e) => setTokenPolicy({ ...tokenPolicy, enabled: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Enable token gates</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={tokenPolicy.finalSale}
                  onChange={(e) => setTokenPolicy({ ...tokenPolicy, finalSale: e.target.checked })}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm font-medium text-gray-700">Final sale tokens (no refunds)</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Job unlock (standard)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tokenPolicy.costs.jobUnlockStandard}
                    onChange={(e) =>
                      setTokenPolicy({
                        ...tokenPolicy,
                        costs: { ...tokenPolicy.costs, jobUnlockStandard: Number(e.target.value) || 0 }
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Listing publish
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tokenPolicy.costs.listingPublish}
                    onChange={(e) =>
                      setTokenPolicy({
                        ...tokenPolicy,
                        costs: { ...tokenPolicy.costs, listingPublish: Number(e.target.value) || 0 }
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer cash fee
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tokenPolicy.costs.cashFee}
                    onChange={(e) =>
                      setTokenPolicy({
                        ...tokenPolicy,
                        costs: { ...tokenPolicy.costs, cashFee: Number(e.target.value) || 0 }
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ad boost 24h
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={tokenPolicy.costs.adBoost24h}
                    onChange={(e) =>
                      setTokenPolicy({
                        ...tokenPolicy,
                        costs: { ...tokenPolicy.costs, adBoost24h: Number(e.target.value) || 0 }
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
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
                  onChange={(e) => setSettings({...settings, minimumPayoutAmount: parseFloat(e.target.value)})}
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

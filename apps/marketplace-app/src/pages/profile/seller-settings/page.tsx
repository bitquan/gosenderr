import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase/client'
import { SellerBadge, SellerBadgeList } from '../../../components/marketplace/SellerBadge'
import { SellerBadge as BadgeType } from '../../../types/marketplace'

export default function SellerSettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    buyerProtectionEnabled: false,
    instantPayoutEnabled: false,
    returnsAccepted: false,
    returnWindowDays: 7 as 7 | 14 | 30,
    shippingGuarantee: undefined as '24h' | '48h' | '3-5days' | undefined
  })
  const [badges, setBadges] = useState<BadgeType[]>([])
  const [sellerScore, setSellerScore] = useState(0)

  useEffect(() => {
    loadSettings()
  }, [user])

  const loadSettings = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists()) {
        const data = userDoc.data()
        const sellerProfile = data.sellerProfile
        
        if (sellerProfile) {
          setSettings({
            buyerProtectionEnabled: sellerProfile.buyerProtectionEnabled || false,
            instantPayoutEnabled: sellerProfile.instantPayoutEnabled || false,
            returnsAccepted: sellerProfile.returnsAccepted || false,
            returnWindowDays: sellerProfile.returnWindowDays || 7,
            shippingGuarantee: sellerProfile.shippingGuarantee
          })
          setBadges(sellerProfile.badges || [])
          setSellerScore(sellerProfile.sellerScore || 0)
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user) return
    
    setSaving(true)
    try {
      // Calculate which badges to award based on settings
      const earnedBadges: BadgeType[] = []
      
      if (settings.buyerProtectionEnabled) {
        earnedBadges.push(BadgeType.BUYER_PROTECTION)
      }
      if (settings.returnsAccepted) {
        earnedBadges.push(BadgeType.RETURNS_ACCEPTED)
      }
      if (settings.shippingGuarantee) {
        earnedBadges.push(BadgeType.FAST_SHIPPER)
      }
      // Top Rated and Verified are earned through performance, not settings
      // Quick Responder is calculated from message response times
      
      await updateDoc(doc(db, 'users', user.uid), {
        'sellerProfile.buyerProtectionEnabled': settings.buyerProtectionEnabled,
        'sellerProfile.instantPayoutEnabled': settings.instantPayoutEnabled,
        'sellerProfile.returnsAccepted': settings.returnsAccepted,
        'sellerProfile.returnWindowDays': settings.returnWindowDays,
        'sellerProfile.shippingGuarantee': settings.shippingGuarantee || null,
        'sellerProfile.badges': earnedBadges // Save the calculated badges array
      })
      
      alert('Settings saved successfully!')
      await loadSettings() // Reload to get updated badges
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/profile/listings')}
            className="text-purple-600 hover:text-purple-700 mb-4 flex items-center gap-2"
          >
            ← Back to Listings
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Seller Settings</h1>
          <p className="text-gray-600 mt-1">Configure your trust badges and payment options</p>
        </div>

        {/* Stripe Connect Setup Card */}
        {!(user as any)?.sellerProfile?.stripeOnboardingComplete && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 mb-6 text-white">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">💳 Set Up Payments</h3>
                <p className="text-white/90 mb-4">
                  Connect your bank account to receive payments from buyers. Quick setup through Stripe (takes 5 minutes).
                </p>
                <button
                  onClick={() => navigate('/profile/stripe-onboarding')}
                  className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Connect Bank Account →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Seller Score Card */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-lg p-6 mb-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold opacity-90">Seller Score</h3>
              <p className="text-4xl font-bold mt-1">{sellerScore}</p>
            </div>
            <div className="text-6xl">🏆</div>
          </div>
          <div className="border-t border-white/20 pt-4">
            <p className="text-sm opacity-90 mb-2">Your Badges</p>
            {badges.length > 0 ? (
              <SellerBadgeList badges={badges} size="md" showLabel={true} maxDisplay={6} />
            ) : (
              <p className="text-sm opacity-75">Enable settings below to earn badges</p>
            )}
          </div>
        </div>

        {/* Settings Cards */}
        <div className="space-y-6">
          {/* Buyer Protection */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">🛡️ Buyer Protection</h3>
                  {settings.buyerProtectionEnabled && <SellerBadge badge={BadgeType.BUYER_PROTECTION} size="sm" />}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Funds held for 3 days after delivery. Buyers can open disputes during this time.
                </p>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-green-900 mb-1">Benefits:</p>
                  <ul className="text-green-800 space-y-1 list-disc list-inside">
                    <li>Earn Buyer Protection badge</li>
                    <li>Higher buyer trust = more sales</li>
                    <li>Show up in protected listings filter</li>
                  </ul>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm mt-2">
                  <p className="font-semibold text-yellow-900 mb-1">Trade-off:</p>
                  <p className="text-yellow-800">Wait 3 days for funds (vs instant)</p>
                </div>
              </div>
              <div className="ml-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.buyerProtectionEnabled}
                    onChange={(e) => setSettings({...settings, buyerProtectionEnabled: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Instant Payout */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">⚡ Instant Payout</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Get paid in 30 minutes instead of 2 business days. +1% fee per transaction.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-blue-900 mb-1">Benefits:</p>
                  <ul className="text-blue-800 space-y-1 list-disc list-inside">
                    <li>Money in your bank within 30 minutes</li>
                    <li>Better cash flow for your business</li>
                  </ul>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm mt-2">
                  <p className="font-semibold text-yellow-900 mb-1">Cost:</p>
                  <p className="text-yellow-800">Additional 1% fee (on top of standard fees)</p>
                </div>
              </div>
              <div className="ml-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.instantPayoutEnabled}
                    onChange={(e) => setSettings({...settings, instantPayoutEnabled: e.target.checked})}
                    disabled={settings.buyerProtectionEnabled}
                    className="sr-only peer disabled:opacity-50"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            {settings.buyerProtectionEnabled && (
              <p className="text-xs text-gray-500 mt-2">
                ℹ️ Disabled when Buyer Protection is enabled (incompatible)
              </p>
            )}
          </div>

          {/* Returns */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">🔄 Returns Accepted</h3>
                  {settings.returnsAccepted && <SellerBadge badge={BadgeType.RETURNS_ACCEPTED} size="sm" />}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Accept returns within selected time window. Return shipping paid by buyer.
                </p>
                
                {settings.returnsAccepted && (
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Return Window</label>
                    <select
                      value={settings.returnWindowDays}
                      onChange={(e) => setSettings({...settings, returnWindowDays: parseInt(e.target.value) as 7 | 14 | 30})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="ml-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.returnsAccepted}
                    onChange={(e) => setSettings({...settings, returnsAccepted: e.target.checked})}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Shipping Guarantee */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">📦 Shipping Guarantee</h3>
                {settings.shippingGuarantee === '24h' && <SellerBadge badge={BadgeType.FAST_SHIPPER} size="sm" />}
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Commit to shipping items within a specific timeframe
              </p>
              
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setSettings({...settings, shippingGuarantee: '24h'})}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    settings.shippingGuarantee === '24h'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">⚡</div>
                  <div className="text-sm">24 hours</div>
                </button>
                <button
                  onClick={() => setSettings({...settings, shippingGuarantee: '48h'})}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    settings.shippingGuarantee === '48h'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">📦</div>
                  <div className="text-sm">48 hours</div>
                </button>
                <button
                  onClick={() => setSettings({...settings, shippingGuarantee: '3-5days'})}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    settings.shippingGuarantee === '3-5days'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">🚚</div>
                  <div className="text-sm">3-5 days</div>
                </button>
              </div>
              
              {settings.shippingGuarantee && (
                <button
                  onClick={() => setSettings({...settings, shippingGuarantee: undefined})}
                  className="text-sm text-red-600 hover:text-red-700 mt-2"
                >
                  Remove guarantee
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

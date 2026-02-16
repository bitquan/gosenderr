import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../../../lib/firebase/client'
import { SellerBadge, SellerBadgeList } from '../../../components/marketplace/SellerBadge'
import { SellerBadge as BadgeType, type SellerPayoutMode } from '../../../types/marketplace'
import { createTokenCheckoutSession, getTokenWallet, makeIdempotencyKey } from '../../../lib/tokens'
import { canUsePaymentMocks } from '../../../lib/runtime/paymentSafety'

export default function SellerSettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
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
  const [sellerStripeComplete, setSellerStripeComplete] = useState(false)
  const [sellerStripeAccountId, setSellerStripeAccountId] = useState<string | null>(null)
  const [sellerPayoutMode, setSellerPayoutMode] = useState<SellerPayoutMode>('stripe_connect')
  const [sellerExternalPayoutProvider, setSellerExternalPayoutProvider] = useState('')
  const [sellerExternalPayoutHandle, setSellerExternalPayoutHandle] = useState('')
  const [tokenWallet, setTokenWallet] = useState<{
    available: number;
    reserved: number;
    lifetimePurchased: number;
    lifetimeSpent: number;
  } | null>(null)
  const [tokenPolicy, setTokenPolicy] = useState<{
    packs: Array<{ id: string; name: string; tokens: number; priceUsd: number; active: boolean }>;
    costs: Record<string, number>;
  } | null>(null)
  const [tokenBusyPackId, setTokenBusyPackId] = useState<string | null>(null)
  const paymentMocksEnabled = canUsePaymentMocks()

  useEffect(() => {
    loadSettings()
  }, [user])

  useEffect(() => {
    if (!user) return
    loadTokenData()
  }, [user])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('mock_onboarding') === 'complete' && user && paymentMocksEnabled) {
      const userId = (user as any).uid ?? (user as any).id
      if (!userId) return
      const accountId =
        sellerStripeAccountId || (user as any)?.sellerProfile?.stripeAccountId || 'acct_mock_dev'
      const payload = {
        'sellerProfile.stripeOnboardingComplete': true,
        'sellerProfile.stripeAccountId': accountId,
        updatedAt: serverTimestamp()
      }
      updateDoc(doc(db, 'users', userId), payload)
        .catch(() => setDoc(doc(db, 'users', userId), payload, { merge: true }))
        .then(() => {
          setSellerStripeComplete(true)
          return loadSettings()
        })
        .catch((error) => console.error('Error completing mock onboarding:', error))
    }
  }, [paymentMocksEnabled, location.search, user, sellerStripeAccountId])

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
          setSellerStripeComplete(Boolean(sellerProfile.stripeOnboardingComplete))
          setSellerStripeAccountId(sellerProfile.stripeAccountId || null)
          setSellerPayoutMode(
            (sellerProfile.payoutMode || sellerProfile.sellerPayoutMode || 'stripe_connect') as SellerPayoutMode,
          )
          setSellerExternalPayoutProvider(sellerProfile.externalPayoutProvider || '')
          setSellerExternalPayoutHandle(sellerProfile.externalPayoutHandle || '')
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTokenData = async () => {
    try {
      const snapshot = await getTokenWallet()
      setTokenWallet({
        available: snapshot.wallet.available,
        reserved: snapshot.wallet.reserved,
        lifetimePurchased: snapshot.wallet.lifetimePurchased,
        lifetimeSpent: snapshot.wallet.lifetimeSpent,
      })
      setTokenPolicy({
        packs: snapshot.policy.packs || [],
        costs: snapshot.policy.costs || {},
      })
    } catch (error) {
      console.error('Error loading token wallet:', error)
    }
  }

  const handleBuyTokens = async (packId: string) => {
    try {
      setTokenBusyPackId(packId)
      const response = await createTokenCheckoutSession({
        actorType: 'seller',
        packId,
        idempotencyKey: makeIdempotencyKey('seller_buy_tokens'),
        successUrl: `${window.location.origin}/profile/seller-settings?token_purchase=success`,
        cancelUrl: `${window.location.origin}/profile/seller-settings?token_purchase=cancelled`,
      })
      if (!response.checkoutUrl) {
        throw new Error('Checkout URL missing')
      }
      window.location.href = response.checkoutUrl
    } catch (error) {
      console.error('Error starting token checkout:', error)
      alert('Could not start token checkout. Please try again.')
    } finally {
      setTokenBusyPackId(null)
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
        'sellerProfile.instantPayoutEnabled':
          sellerPayoutMode === 'stripe_connect' ? settings.instantPayoutEnabled : false,
        'sellerProfile.returnsAccepted': settings.returnsAccepted,
        'sellerProfile.returnWindowDays': settings.returnWindowDays,
        'sellerProfile.shippingGuarantee': settings.shippingGuarantee || null,
        'sellerProfile.badges': earnedBadges, // Save the calculated badges array
        'sellerProfile.payoutMode': sellerPayoutMode,
        'sellerProfile.sellerPayoutMode': sellerPayoutMode,
        'sellerProfile.externalPayoutProvider':
          sellerPayoutMode === 'stripe_connect' ? null : sellerExternalPayoutProvider.trim() || null,
        'sellerProfile.externalPayoutHandle':
          sellerPayoutMode === 'stripe_connect' ? null : sellerExternalPayoutHandle.trim() || null,
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

        {/* Payout Method */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">💸 Seller payout method</h3>
          <p className="text-sm text-gray-600 mb-4">
            Choose how your seller earnings are settled.
          </p>
          <select
            value={sellerPayoutMode}
            onChange={(e) => setSellerPayoutMode(e.target.value as SellerPayoutMode)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="stripe_connect">Stripe Connect</option>
            <option value="external_provider">External provider</option>
            <option value="manual_settlement">Manual settlement</option>
          </select>

          {sellerPayoutMode === 'stripe_connect' ? (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
              Marketplace checkout and automatic transfers run through Stripe Connect.
            </div>
          ) : null}

          {sellerPayoutMode === 'external_provider' ? (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={sellerExternalPayoutProvider}
                onChange={(e) => setSellerExternalPayoutProvider(e.target.value)}
                placeholder="Provider (PayPal, Cash App, Zelle...)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                value={sellerExternalPayoutHandle}
                onChange={(e) => setSellerExternalPayoutHandle(e.target.value)}
                placeholder="Payout handle / account ID"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500">
                Platform fee tracking stays in Senderrplace; payout transfer happens in your external provider.
              </p>
            </div>
          ) : null}

          {sellerPayoutMode === 'manual_settlement' ? (
            <div className="mt-3 space-y-2">
              <input
                type="text"
                value={sellerExternalPayoutProvider}
                onChange={(e) => setSellerExternalPayoutProvider(e.target.value)}
                placeholder="Settlement channel (bank transfer, cash, internal ledger)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                value={sellerExternalPayoutHandle}
                onChange={(e) => setSellerExternalPayoutHandle(e.target.value)}
                placeholder="Settlement reference / account note"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
              <p className="text-xs text-gray-500">
                Use manual mode only if your settlement process is off-platform.
              </p>
            </div>
          ) : null}
        </div>

        {/* Token Wallet */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">🪙 Senderr Token Wallet</h3>
          <p className="text-sm text-gray-600 mb-4">
            Sellers using external/manual payouts spend tokens to publish listings.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
              <p className="text-xs text-purple-700">Available</p>
              <p className="text-xl font-bold text-purple-900">{tokenWallet?.available ?? 0}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs text-amber-700">Reserved</p>
              <p className="text-xl font-bold text-amber-900">{tokenWallet?.reserved ?? 0}</p>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Spent</p>
              <p className="text-xl font-bold text-emerald-900">{tokenWallet?.lifetimeSpent ?? 0}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Listing publish cost: {tokenPolicy?.costs?.listingPublish ?? 2} token(s). Token purchases are final sale.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(tokenPolicy?.packs || [])
              .filter((pack) => pack.active)
              .map((pack) => (
                <button
                  key={pack.id}
                  type="button"
                  onClick={() => handleBuyTokens(pack.id)}
                  disabled={tokenBusyPackId === pack.id}
                  className="rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-left hover:bg-gray-100 disabled:opacity-60"
                >
                  <p className="text-sm font-semibold text-gray-900">{pack.name}</p>
                  <p className="text-xs text-gray-600">
                    {pack.tokens} tokens • ${pack.priceUsd.toFixed(2)}
                  </p>
                </button>
              ))}
          </div>
        </div>

        {/* Stripe Connect Setup Card */}
        {sellerPayoutMode === 'stripe_connect' && !sellerStripeComplete && (
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl shadow-lg p-6 mb-6 text-white">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-2">💳 Set Up Stripe Connect</h3>
                <p className="text-white/90 mb-4">
                  Connect your bank account to receive automatic payouts from marketplace checkout.
                </p>
                <button
                  onClick={() => navigate('/profile/stripe-onboarding')}
                  className="bg-white text-green-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                >
                  Connect Bank Account →
                </button>
                {paymentMocksEnabled ? (
                  <p className="text-[11px] text-white/80 mt-3">
                    Payment mock onboarding links are enabled in this environment.
                  </p>
                ) : null}
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
                    disabled={settings.buyerProtectionEnabled || sellerPayoutMode !== 'stripe_connect'}
                    className="sr-only peer disabled:opacity-50"
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
            {settings.buyerProtectionEnabled ? (
              <p className="text-xs text-gray-500 mt-2">
                ℹ️ Disabled when Buyer Protection is enabled (incompatible)
              </p>
            ) : null}
            {sellerPayoutMode !== 'stripe_connect' ? (
              <p className="text-xs text-gray-500 mt-2">
                ℹ️ Instant payout requires Stripe Connect payout mode.
              </p>
            ) : null}
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

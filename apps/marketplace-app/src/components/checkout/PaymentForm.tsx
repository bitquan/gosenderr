import { useEffect, useState } from 'react'
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'
import { functions } from '../../lib/firebase'
import { httpsCallable } from 'firebase/functions'
import type { CartItem } from '../../contexts/CartContext'
import {
  commitTokenAction,
  getTokenWallet,
  makeIdempotencyKey,
  releaseTokenAction,
  reserveTokenAction,
} from '../../lib/tokens'

interface PaymentFormProps {
  amount: number
  shippingInfo: {
    fullName: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    zipCode: string
    country: string
    lat?: number
    lng?: number
  }
  items: CartItem[]
  onSuccess: (orderId: string) => void
}

export function PaymentForm({ amount, shippingInfo, items, onSuccess }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash'>('card')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)
  const [tokenCost, setTokenCost] = useState(1)
  const [walletTokens, setWalletTokens] = useState<number | null>(null)
  const [walletLoading, setWalletLoading] = useState(true)

  useEffect(() => {
    let active = true
    const loadWallet = async () => {
      try {
        const { wallet, policy } = await getTokenWallet()
        if (!active) return
        setWalletTokens(wallet.available)
        setTokenCost(Number(policy.costs?.cashFee || 1))
      } catch (walletError) {
        console.error('Failed to load token wallet for checkout:', walletError)
      } finally {
        if (active) setWalletLoading(false)
      }
    }
    loadWallet()
    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setError(null)
    setProcessingPayment(true)

    try {
      const createMarketplaceOrder = httpsCallable(functions, 'createMarketplaceOrder')

      if (paymentMethod === 'cash') {
        const tokenIdempotencyKey = makeIdempotencyKey('customer_cash_checkout')
        let tokenReservationId: string | null = null

        try {
          const reserveResult = await reserveTokenAction({
            actorType: 'customer',
            action: 'cash_fee',
            referenceId: `cash_checkout:${Date.now()}`,
            idempotencyKey: tokenIdempotencyKey,
            metadata: {
              source: 'checkout_cart',
              amountUsd: amount,
              itemCount: items.length,
            },
          })

          if (reserveResult.status === 'reserved' && reserveResult.reservationId) {
            tokenReservationId = reserveResult.reservationId
          }

          const { data } = await createMarketplaceOrder({
            amount: Math.round(amount * 100),
            currency: 'usd',
            paymentMode: 'cash',
            shippingInfo,
            items: items.map(cartItem => ({
              itemId: cartItem.item.id!,
              title: cartItem.item.title,
              quantity: cartItem.quantity,
              price: cartItem.item.price,
              sellerId: cartItem.item.sellerId,
              sellerName: cartItem.item.sellerName,
              vendorId: cartItem.item.sellerId,
            })),
          }) as {
            data: {
              orderId?: string;
              orderIds?: string[];
              status: string;
            };
          };

          if (tokenReservationId) {
            const commitResult = await commitTokenAction({
              reservationId: tokenReservationId,
              idempotencyKey: tokenIdempotencyKey,
            })
            setWalletTokens(commitResult.wallet.available)
          }

          const resolvedOrderId = data.orderId || data.orderIds?.[0]
          if (!resolvedOrderId) {
            throw new Error('Order created but no order ID was returned')
          }

          onSuccess(resolvedOrderId)
          return
        } catch (cashError) {
          if (tokenReservationId) {
            try {
              const releaseResult = await releaseTokenAction({
                reservationId: tokenReservationId,
                idempotencyKey: tokenIdempotencyKey,
              })
              setWalletTokens(releaseResult.wallet.available)
            } catch (releaseError) {
              console.error('Failed to release cash checkout token reservation:', releaseError)
            }
          }
          throw cashError
        }
      }

      if (!stripe || !elements) {
        throw new Error('Stripe is not ready yet')
      }

      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Card element not found')
      }

      const { error: pmError, paymentMethod: createdPaymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: shippingInfo.fullName,
          email: shippingInfo.email,
          phone: shippingInfo.phone,
          address: {
            line1: shippingInfo.address,
            city: shippingInfo.city,
            state: shippingInfo.state,
            postal_code: shippingInfo.zipCode,
            country: 'US',
          },
        },
      })

      if (pmError) {
        throw new Error(pmError.message)
      }

      const { data } = await createMarketplaceOrder({
        amount: Math.round(amount * 100),
        currency: 'usd',
        paymentMode: 'card',
        paymentMethodId: createdPaymentMethod.id,
        shippingInfo,
        items: items.map(cartItem => ({
          itemId: cartItem.item.id!,
          title: cartItem.item.title,
          quantity: cartItem.quantity,
          price: cartItem.item.price,
          sellerId: cartItem.item.sellerId,
          sellerName: cartItem.item.sellerName,
          vendorId: cartItem.item.sellerId,
        })),
      }) as {
        data: {
          clientSecret: string;
          orderId?: string;
          orderIds?: string[];
          orderGroupId?: string;
          status: string;
        };
      };

      const resolvedOrderId = data.orderId || data.orderIds?.[0];
      if (!resolvedOrderId) {
        throw new Error('Order creation succeeded but no order ID was returned');
      }

      if (data.status === 'succeeded') {
        onSuccess(resolvedOrderId)
      } else if (data.status === 'requires_action') {
        const { error: confirmError } = await stripe.confirmCardPayment(data.clientSecret)
        if (confirmError) {
          throw new Error(confirmError.message)
        }
        onSuccess(resolvedOrderId)
      } else {
        throw new Error('Payment failed')
      }
    } catch (err) {
      console.error('Payment error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred during payment')
    } finally {
      setLoading(false)
      setProcessingPayment(false)
    }
  }

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
        fontFamily: '"Inter", system-ui, sans-serif',
      },
      invalid: {
        color: '#9e2146',
      },
    },
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Payment Method
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod('card')}
            className={`rounded-lg border px-4 py-3 text-left transition ${
              paymentMethod === 'card'
                ? 'border-blue-600 bg-blue-50 text-blue-900'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            <div className="font-semibold">Card (Stripe)</div>
            <div className="text-xs mt-1">Pay now with card</div>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod('cash')}
            className={`rounded-lg border px-4 py-3 text-left transition ${
              paymentMethod === 'cash'
                ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
            }`}
          >
            <div className="font-semibold">Cash on Delivery</div>
            <div className="text-xs mt-1">
              Uses {tokenCost} Senderr token{tokenCost === 1 ? '' : 's'} fee
            </div>
          </button>
        </div>
      </div>

      {paymentMethod === 'card' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Information
          </label>
          <div className="p-4 border border-gray-300 rounded-lg">
            <CardElement options={cardElementOptions} />
          </div>
        </div>
      )}

      {paymentMethod === 'cash' && (
        <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50 text-sm text-emerald-900">
          <p className="font-semibold">Cash checkout token fee</p>
          <p className="mt-1">
            Required now: {tokenCost} token{tokenCost === 1 ? '' : 's'}
          </p>
          <p className="mt-1">
            Wallet balance:{' '}
            {walletLoading ? 'Loading...' : walletTokens == null ? 'Unavailable' : `${walletTokens} tokens`}
          </p>
          {walletTokens != null && walletTokens < tokenCost && (
            <p className="mt-2 text-red-700">
              Insufficient tokens. Top up in Settings before using cash checkout.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          <strong>Test Card:</strong> Use 4242 4242 4242 4242 with any future expiry date and any 3-digit CVC.
        </p>
      </div>

      <button
        type="submit"
        disabled={(paymentMethod === 'card' && !stripe) || loading || processingPayment}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {processingPayment ? (
          <>
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing Payment...
          </>
        ) : (
          paymentMethod === 'cash'
            ? `Place Cash Order ($${amount.toFixed(2)})`
            : `Pay $${amount.toFixed(2)}`
        )}
      </button>

      <p className="text-xs text-center text-gray-500">
        By completing this purchase you agree to our Terms of Service and Privacy Policy
      </p>
    </form>
  )
}

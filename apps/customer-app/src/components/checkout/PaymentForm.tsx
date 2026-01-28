import { useState } from 'react'
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js'
import { functions } from '../../lib/firebase'
import { httpsCallable } from 'firebase/functions'
import { useAuth } from '../../hooks/useAuth'
import type { CartItem } from '../../contexts/CartContext'

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
  }
  items: CartItem[]
  onSuccess: (orderId: string) => void
}

export function PaymentForm({ amount, shippingInfo, items, onSuccess }: PaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processingPayment, setProcessingPayment] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setError(null)
    setProcessingPayment(true)

    try {
      // Get the card element
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error('Card element not found')
      }

      // Create payment method
      const { error: pmError, paymentMethod } = await stripe.createPaymentMethod({
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

      // Create payment intent via Cloud Function
      const createPaymentIntent = httpsCallable(functions, 'createPaymentIntent')
      const { data } = await createPaymentIntent({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        paymentMethodId: paymentMethod.id,
        shippingInfo,
        items: items.map(item => ({
          itemId: item.id,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          vendorId: item.vendorId,
        })),
      }) as { data: { clientSecret: string; orderId: string } }

      // Confirm payment
      const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(data.clientSecret)

      if (confirmError) {
        throw new Error(confirmError.message)
      }

      if (paymentIntent?.status === 'succeeded') {
        onSuccess(data.orderId)
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
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <div className="p-4 border border-gray-300 rounded-lg">
          <CardElement options={cardElementOptions} />
        </div>
      </div>

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
        disabled={!stripe || loading || processingPayment}
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
          `Pay $${amount.toFixed(2)}`
        )}
      </button>

      <p className="text-xs text-center text-gray-500">
        By completing this purchase you agree to our Terms of Service and Privacy Policy
      </p>
    </form>
  )
}

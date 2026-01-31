import { httpsCallable } from 'firebase/functions'
import { loadStripe, Stripe } from '@stripe/stripe-js'
import { functions } from '@/lib/firebase/client'

let cachedPublishableKey: string | null = null
let stripePromise: Promise<Stripe | null> | null = null

async function fetchPublishableKey(): Promise<string> {
  if (cachedPublishableKey) return cachedPublishableKey

  const fallbackKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''

  try {
    if (functions) {
      const callable = httpsCallable(functions, 'getPublicConfig')
      const result = await callable()
      const data = result.data as { stripePublishableKey?: string }
      if (data?.stripePublishableKey) {
        cachedPublishableKey = data.stripePublishableKey
        return cachedPublishableKey
      }
    }
  } catch (error) {
    console.warn('Failed to fetch Stripe publishable key from config:', error)
  }

  cachedPublishableKey = fallbackKey
  return cachedPublishableKey
}

export function getStripePromise(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = fetchPublishableKey().then((key) => {
      if (!key) {
        console.warn('Stripe publishable key is missing')
        return null
      }
      return loadStripe(key)
    })
  }

  return stripePromise
}

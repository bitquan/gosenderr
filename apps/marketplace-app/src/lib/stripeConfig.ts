import { loadStripe, Stripe } from '@stripe/stripe-js'
import { getPublicConfig } from './publicConfig'

let cachedPublishableKey: string | null = null
let stripePromise: Promise<Stripe | null> | null = null

async function fetchPublishableKey(): Promise<string> {
  if (cachedPublishableKey) return cachedPublishableKey

  const fallbackKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || ''

  try {
    const config = await getPublicConfig()
    if (config?.stripePublishableKey) {
      cachedPublishableKey = config.stripePublishableKey
      return cachedPublishableKey
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

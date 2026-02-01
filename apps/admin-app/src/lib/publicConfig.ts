import { httpsCallable } from 'firebase/functions'
import { functions } from './firebase'

export interface PublicConfig {
  stripePublishableKey?: string
  stripeMode?: 'test' | 'live'
  mapboxPublicToken?: string
}

let cachedConfig: PublicConfig | null = null
let inFlight: Promise<PublicConfig> | null = null

export async function getPublicConfig(): Promise<PublicConfig> {
  if (cachedConfig) return cachedConfig
  if (!functions) return {}

  if (!inFlight) {
    const fn = httpsCallable<undefined, PublicConfig>(functions, 'getPublicConfig')
    inFlight = fn(undefined)
      .then((res) => {
        cachedConfig = res.data || {}
        return cachedConfig
      })
      .catch((error) => {
        console.error('Failed to load public config', error)
        return {}
      })
  }

  return inFlight
}
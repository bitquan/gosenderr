import { doc, getDoc } from 'firebase/firestore'

import { db } from './firebase'

export interface PublicConfig {
  stripePublishableKey?: string
  stripeMode?: 'test' | 'live'
  mapboxPublicToken?: string
}

let cachedConfig: PublicConfig | null = null
let inFlight: Promise<PublicConfig> | null = null
let lastFailureAt: number | null = null
const FAILURE_BACKOFF_MS = 60 * 1000

function shouldUseFunctionsEmulator(): boolean {
  return (
    import.meta.env.DEV &&
    import.meta.env.VITE_ADMIN_APP_USE_EMULATORS === 'true'
  )
}

function resolvePublicConfigUrl(): string {
  const explicitUrl = import.meta.env.VITE_PUBLIC_CONFIG_URL || ''
  if (explicitUrl) return explicitUrl

  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || ''
  if (!projectId) return ''

  if (shouldUseFunctionsEmulator()) {
    return `http://127.0.0.1:5001/${projectId}/us-central1/getPublicConfigHttp`
  }

  return `https://us-central1-${projectId}.cloudfunctions.net/getPublicConfigHttp`
}

function mapConfigFromSecrets(
  stripeData: Record<string, unknown>,
  mapboxData: Record<string, unknown>,
): PublicConfig {
  const configuredMode = String(stripeData.mode || 'test')
  const livePublishableKey = String(stripeData.livePublishableKey || '')
  const testPublishableKey = String(
    stripeData.publishableKey || stripeData.testPublishableKey || '',
  )

  const useLive = configuredMode === 'live' && !!livePublishableKey

  return {
    stripePublishableKey: useLive ? livePublishableKey : testPublishableKey,
    stripeMode: useLive ? 'live' : 'test',
    mapboxPublicToken: String(mapboxData.publicToken || ''),
  }
}

async function getPublicConfigFromFirestore(): Promise<PublicConfig> {
  if (!db) return {}

  try {
    const [stripeSnap, mapboxSnap] = await Promise.all([
      getDoc(doc(db, 'secrets', 'stripe')),
      getDoc(doc(db, 'secrets', 'mapbox')),
    ])

    const stripeData = stripeSnap.exists() ? (stripeSnap.data() as Record<string, unknown>) : {}
    const mapboxData = mapboxSnap.exists() ? (mapboxSnap.data() as Record<string, unknown>) : {}

    return mapConfigFromSecrets(stripeData, mapboxData)
  } catch (error) {
    console.error('Failed to load public config via Firestore', error)
    return {}
  }
}

export async function getPublicConfig(): Promise<PublicConfig> {
  if (cachedConfig) return cachedConfig

  if (lastFailureAt && Date.now() - lastFailureAt < FAILURE_BACKOFF_MS) {
    return {}
  }

  if (!inFlight) {
    const url = resolvePublicConfigUrl()
    if (!url) return {}

    inFlight = fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Public config request failed: ${res.status}`)
        }
        return res.json() as Promise<PublicConfig>
      })
      .then((data) => {
        cachedConfig = data || {}
        return cachedConfig
      })
      .catch((error) => {
        console.error('Failed to load public config', error)
        lastFailureAt = Date.now()
        return {}
      })
  }

  const result = await inFlight
  if (Object.keys(result || {}).length) {
    return result
  }

  const firestoreResult = await getPublicConfigFromFirestore()
  if (Object.keys(firestoreResult || {}).length) {
    cachedConfig = firestoreResult
    return firestoreResult
  }

  // Avoid noisy callable CORS errors in local admin dev when the functions
  // emulator does not expose callable CORS headers consistently.
  if (import.meta.env.DEV) {
    lastFailureAt = Date.now()
    return {}
  }

  try {
    const { httpsCallable } = await import('firebase/functions')
    const { functions } = await import('./firebase')
    const getPublicConfigFn = httpsCallable<void, PublicConfig>(functions, 'getPublicConfig')
    const response = await getPublicConfigFn()
    cachedConfig = response.data || {}
    return cachedConfig
  } catch (callableError) {
    console.error('Failed to load public config via callable', callableError)
    lastFailureAt = Date.now()
    return {}
  }
}

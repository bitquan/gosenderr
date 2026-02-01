export interface PublicConfig {
  stripePublishableKey?: string
  stripeMode?: 'test' | 'live'
  mapboxPublicToken?: string
}

let cachedConfig: PublicConfig | null = null
let inFlight: Promise<PublicConfig> | null = null

function resolvePublicConfigUrl(): string {
  const explicitUrl = import.meta.env.VITE_PUBLIC_CONFIG_URL || ''
  if (explicitUrl) return explicitUrl

  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || ''
  if (!projectId) return ''

  return `https://us-central1-${projectId}.cloudfunctions.net/getPublicConfigHttp`
}

export async function getPublicConfig(): Promise<PublicConfig> {
  if (cachedConfig) return cachedConfig

  if (!inFlight) {
    const url = resolvePublicConfigUrl()
    if (!url) return {}

    inFlight = fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`Public config request failed: ${res.status}`)
        }
        const data = (await res.json()) as PublicConfig
        cachedConfig = data || {}
        return cachedConfig
      })
      .catch((error) => {
        console.error('Failed to load public config', error)
        return {}
      })
  }

  return inFlight
}
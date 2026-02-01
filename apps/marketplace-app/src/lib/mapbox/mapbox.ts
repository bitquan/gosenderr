import { getPublicConfig } from '../publicConfig'

let cachedToken: string | null = null
let inFlight: Promise<string> | null = null

export async function getMapboxToken(): Promise<string> {
  if (cachedToken) return cachedToken

  if (!inFlight) {
    inFlight = (async () => {
      const envToken = import.meta.env.VITE_MAPBOX_TOKEN || ''
      if (envToken) return envToken

      try {
        const config = await getPublicConfig()
        if (config.mapboxPublicToken) return config.mapboxPublicToken
      } catch (error) {
        console.error('Failed to load Mapbox token from public config', error)
      }

      console.warn('VITE_MAPBOX_TOKEN is not set')
      return ''
    })()
  }

  cachedToken = await inFlight
  return cachedToken
}

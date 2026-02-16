import { getPublicConfig } from '../publicConfig'

let cachedToken: string | null = null
let inFlight: Promise<string> | null = null

function isPlaceholderToken(value: string): boolean {
  const token = value.trim().toLowerCase()
  return (
    token === '' ||
    token === 'your_mapbox_token' ||
    token === 'replace_with_mapbox_token' ||
    token === 'replace_me' ||
    token.includes('example')
  )
}

export async function getMapboxToken(): Promise<string> {
  if (cachedToken) return cachedToken

  if (!inFlight) {
    inFlight = (async () => {
      const envToken = import.meta.env.VITE_MAPBOX_TOKEN || ''
      if (!isPlaceholderToken(envToken)) return envToken.trim()

      try {
        const config = await getPublicConfig()
        const publicToken = config.mapboxPublicToken || ''
        if (!isPlaceholderToken(publicToken)) return publicToken.trim()
      } catch (error) {
        console.error('Failed to load Mapbox token from public config', error)
      }

      console.warn('Mapbox token is missing or placeholder. Address autocomplete will require manual entry.')
      return ''
    })()
  }

  cachedToken = await inFlight
  return cachedToken
}

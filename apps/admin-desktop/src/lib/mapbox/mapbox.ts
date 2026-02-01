import { getPublicConfig } from '../publicConfig'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

const ENV_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''

let cachedToken: string | null = null
let inFlight: Promise<string> | null = null

if (!ENV_TOKEN) {
  console.warn('VITE_MAPBOX_TOKEN is not set. Falling back to public config.')
}

export async function getMapboxToken(): Promise<string> {
  if (cachedToken) return cachedToken

  if (!inFlight) {
    inFlight = (async () => {
      try {
        const config = await getPublicConfig()
        if (config.mapboxPublicToken) return config.mapboxPublicToken
      } catch (error) {
        console.error('Failed to load public config for Mapbox', error)
      }

      try {
        const snap = await getDoc(doc(db, 'secrets', 'mapbox'))
        if (snap.exists()) {
          const data = snap.data() as { publicToken?: string }
          if (data.publicToken) return data.publicToken
        }
      } catch (error) {
        console.error('Failed to load Mapbox token from secrets', error)
      }

      return ENV_TOKEN || ''
    })()
  }

  cachedToken = await inFlight
  return cachedToken
}

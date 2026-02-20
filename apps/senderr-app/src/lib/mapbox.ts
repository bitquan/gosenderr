import { getPublicConfig } from './publicConfig'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

export interface GeocodedAddress {
  address: string;
  lat: number;
  lng: number;
  place_name: string;
}

const ENV_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
let cachedToken: string | null = null
let inFlight: Promise<string> | null = null

if (!ENV_TOKEN) {
  console.warn('VITE_MAPBOX_TOKEN is not set. Falling back to public config.');
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

/**
 * Geocode an address query using Mapbox Geocoding API
 * Returns an array of possible matches
 */
export async function geocodeAddress(
  query: string,
): Promise<GeocodedAddress[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  const token = await getMapboxToken();

  if (!token) {
    console.error("Mapbox token not configured");
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${token}&autocomplete=true&limit=5`;

    const response = await fetch(url);

    if (!response.ok) {
      const errorBody = await response
        .text()
        .catch(() => "Unable to read response");
      console.error("Geocoding failed:", {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        url: url.replace(token, "REDACTED"),
      });
      return [];
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return [];
    }

    return data.features.map((feature: any) => ({
      address: feature.place_name,
      lat: feature.geometry.coordinates[1], // Mapbox returns [lng, lat]
      lng: feature.geometry.coordinates[0],
      place_name: feature.place_name,
    }));
  } catch (error) {
    console.error("Geocoding error:", error);
    return [];
  }
}

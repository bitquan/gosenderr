import { MAPBOX_TOKEN } from './mapbox';

export interface GeocodedAddress {
  address: string;
  lat: number;
  lng: number;
  place_name: string;
}

/**
 * Geocode an address query using Mapbox Geocoding API
 * Returns an array of possible matches
 */
export async function geocodeAddress(query: string): Promise<GeocodedAddress[]> {
  if (!query || query.trim().length < 3) {
    return [];
  }

  if (!MAPBOX_TOKEN) {
    console.error('Mapbox token not configured');
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&autocomplete=true&limit=5`;

    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Geocoding failed:', response.statusText);
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
    console.error('Geocoding error:', error);
    return [];
  }
}

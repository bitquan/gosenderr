import { getMapboxToken } from "./mapbox";

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

    const data = await response.json().catch(() => ({}));
    const features = Array.isArray((data as any)?.features) ? (data as any).features : [];

    if (features.length === 0) {
      return [];
    }

    return features.map((feature: any) => ({
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

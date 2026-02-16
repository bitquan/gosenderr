import { getMapboxToken } from "./mapbox";

export interface GeocodedAddress {
  address: string;
  lat: number;
  lng: number;
  place_name: string;
}

let geocodingDisabled = false;

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

  if (geocodingDisabled) {
    return [];
  }

  const token = await getMapboxToken();

  if (!token) {
    return [];
  }

  try {
    const encodedQuery = encodeURIComponent(query);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${token}&autocomplete=true&limit=5`;

    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        geocodingDisabled = true;
        console.warn(
          "Mapbox geocoding disabled due auth failure. Use manual address entry until token is fixed.",
        );
        return [];
      }
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

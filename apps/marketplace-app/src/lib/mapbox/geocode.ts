import { getMapboxToken } from "./mapbox";

export interface GeocodedAddress {
  address: string;
  lat: number;
  lng: number;
  place_name: string;
  city?: string;
  state?: string;
  zipCode?: string;
  cityZip?: string;
}

export interface ReverseGeocodedLocation {
  city?: string;
  state?: string;
  zipCode?: string;
  cityZip?: string;
}

function extractContextValue(context: any[] | undefined, prefix: string): any | null {
  if (!Array.isArray(context)) return null;
  return context.find((entry) => typeof entry?.id === "string" && entry.id.startsWith(prefix)) ?? null;
}

const STATE_NAMES = new Set([
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut", "delaware",
  "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa", "kansas", "kentucky",
  "louisiana", "maine", "maryland", "massachusetts", "michigan", "minnesota", "mississippi",
  "missouri", "montana", "nebraska", "nevada", "new hampshire", "new jersey", "new mexico",
  "new york", "north carolina", "north dakota", "ohio", "oklahoma", "oregon", "pennsylvania",
  "rhode island", "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont",
  "virginia", "washington", "west virginia", "wisconsin", "wyoming", "district of columbia",
]);

function cleanCityCandidate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/^\d{5}(?:-\d{4})?$/.test(trimmed)) return undefined;
  if (STATE_NAMES.has(trimmed.toLowerCase())) return undefined;
  if (/^[A-Za-z]{2}$/.test(trimmed)) return undefined;
  return trimmed;
}

function deriveCity(feature: any): string | undefined {
  const context = feature?.context as any[] | undefined;
  const locality = extractContextValue(context, "locality.");
  const place = extractContextValue(context, "place.");
  const district = extractContextValue(context, "district.");
  const neighborhood = extractContextValue(context, "neighborhood.");

  const candidates = [
    locality?.text,
    place?.text,
    district?.text,
    neighborhood?.text,
    feature?.text,
  ];

  for (const candidate of candidates) {
    const clean = cleanCityCandidate(candidate);
    if (clean) return clean;
  }
  return undefined;
}

function formatCityZip(city?: string, state?: string, zipCode?: string): string | undefined {
  if (city && state && zipCode) return `${city}, ${state} ${zipCode}`;
  if (city && zipCode) return `${city} ${zipCode}`;
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (state && zipCode) return `${state} ${zipCode}`;
  if (zipCode) return zipCode;
  if (state) return state;
  return undefined;
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

    return data.features.map((feature: any) => {
      const context = feature?.context as any[] | undefined;
      const region = extractContextValue(context, "region.");
      const postcode = extractContextValue(context, "postcode.");

      const city = deriveCity(feature);
      const regionCode = typeof region?.short_code === "string" ? region.short_code.split("-").pop()?.toUpperCase() : undefined;
      const state = regionCode || region?.text;
      const zipCode = postcode?.text;
      const cityZip = formatCityZip(city, state, zipCode);

      return {
        address: feature.place_name,
        lat: feature.geometry.coordinates[1], // Mapbox returns [lng, lat]
        lng: feature.geometry.coordinates[0],
        place_name: feature.place_name,
        city,
        state,
        zipCode,
        cityZip,
      };
    });
  } catch (error) {
    console.error("Geocoding error:", error);
    return [];
  }
}

export async function reverseGeocodeLocation(
  lat: number,
  lng: number,
): Promise<ReverseGeocodedLocation | null> {
  const token = await getMapboxToken();
  if (!token) return null;

  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(String(lng))},${encodeURIComponent(String(lat))}.json` +
      `?access_token=${token}&types=address,place,postcode,locality,region&limit=1`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    const feature = data?.features?.[0];
    if (!feature) return null;

    const context = feature?.context as any[] | undefined;
    const region = extractContextValue(context, "region.");
    const postcode = extractContextValue(context, "postcode.");

    const city = deriveCity(feature);
    const state = typeof region?.short_code === "string"
      ? region.short_code.split("-").pop()?.toUpperCase()
      : region?.text;
    const zipCode = postcode?.text;
    const cityZip = formatCityZip(city, state, zipCode);

    return { city, state, zipCode, cityZip };
  } catch {
    return null;
  }
}

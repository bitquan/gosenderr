type PickupLocationLike = {
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
};

const ZIP_CODE_PATTERN_GLOBAL = /\b\d{5}(?:-\d{4})?\b/g;
const US_STATE_CODES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];
const US_STATE_CODE_PATTERN = new RegExp(`\\b(${US_STATE_CODES.join("|")})\\b`, "i");
const STREET_HINT_PATTERN =
  /\b(?:st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|ln|lane|way|ct|court|apt|suite|ste|unit)\b/i;

export type ParsedAddressComponents = {
  city: string;
  state: string;
  zipCode: string;
};

export function extractPostalCodeFromAddress(address?: string): string {
  if (!address) return "";

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const findLastZip = (value: string): string => {
    const matches = Array.from(value.matchAll(ZIP_CODE_PATTERN_GLOBAL));
    return matches.length > 0 ? matches[matches.length - 1][0] : "";
  };

  // Prefer ZIP closest to the state segment when available.
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    if (!US_STATE_CODE_PATTERN.test(parts[i])) continue;
    const zipInStatePart = findLastZip(parts[i]);
    if (zipInStatePart) return zipInStatePart;

    const zipInNextPart = findLastZip(parts[i + 1] || "");
    if (zipInNextPart) return zipInNextPart;
  }

  const allMatches = Array.from(address.matchAll(ZIP_CODE_PATTERN_GLOBAL));
  if (allMatches.length === 0) return "";

  // If there is only one 5-digit number and it's in a street-like segment, treat it as house number.
  if (allMatches.length === 1) {
    const onlyZip = allMatches[0][0];
    const segment = parts.find((part) => part.includes(onlyZip)) || "";
    if (isLikelyStreetSegment(segment) && !US_STATE_CODE_PATTERN.test(address)) {
      return "";
    }
  }

  // Fall back to the last 5-digit sequence in the address string.
  return allMatches[allMatches.length - 1][0];
}

function isLikelyStreetSegment(value: string): boolean {
  const segment = value.trim();
  return /^\d/.test(segment) || STREET_HINT_PATTERN.test(segment);
}

function normalizeStateCode(value?: string): string {
  if (!value) return "";
  const match = value.trim().match(US_STATE_CODE_PATTERN);
  return match?.[1]?.toUpperCase() || "";
}

export function parseUsAddressComponents(address?: string): ParsedAddressComponents {
  if (!address) {
    return { city: "", state: "", zipCode: "" };
  }

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const zipCode = extractPostalCodeFromAddress(address);

  let state = "";
  let statePartIndex = -1;

  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const match = parts[i].match(US_STATE_CODE_PATTERN);
    if (match?.[1]) {
      state = match[1].toUpperCase();
      statePartIndex = i;
      break;
    }
  }

  let city = "";
  if (statePartIndex > 0) {
    for (let i = statePartIndex - 1; i >= 0; i -= 1) {
      const candidate = parts[i];
      if (!isLikelyStreetSegment(candidate)) {
        city = candidate;
        break;
      }
    }
  }

  if (!city && parts.length > 1) {
    const candidate = parts[1];
    if (!isLikelyStreetSegment(candidate)) {
      city = candidate;
    }
  }

  if (!city) {
    const fallback = parts.find((segment, index) => {
      if (index === 0) return false;
      if (isLikelyStreetSegment(segment)) return false;
      if (US_STATE_CODE_PATTERN.test(segment)) return false;
      return true;
    });

    city = fallback || "";
  }

  return { city, state, zipCode };
}

export function getApproximatePickupAddress(location: PickupLocationLike): string {
  const parsed = parseUsAddressComponents(location.address);
  const city = (location.city || parsed.city || "").trim();
  const state = normalizeStateCode(location.state) || parsed.state;
  const postalCode = (
    location.postalCode ||
    parsed.zipCode ||
    extractPostalCodeFromAddress(location.address)
  ).trim();

  if (city && postalCode) return `${city} ${postalCode}`;
  if (city && state) return `${city}, ${state}`;
  if (city) return city;
  if (postalCode) return `ZIP ${postalCode}`;
  if (state) return state;
  return "Approximate local pickup area";
}

export function getPickupDisplayAddress(
  location: PickupLocationLike,
  shareExactPickupLocation: boolean,
): string {
  if (shareExactPickupLocation && location.address) {
    return location.address;
  }

  return getApproximatePickupAddress(location);
}

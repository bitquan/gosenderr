import { Timestamp, addDoc, collection, doc, onSnapshot, query, serverTimestamp, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db, isFirebaseReady } from "@/lib/firebase/client";
import { reverseGeocodeLocation } from "@/lib/mapbox/geocode";

export interface FoodPickupRestaurantLocation {
  address: string;
  lat: number;
  lng: number;
}

export interface FoodPickupRestaurantPublicLocation {
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  cityZip?: string | null;
}

export interface FoodPickupRestaurantInput {
  courierUid?: string;
  courierId?: string; // deprecated
  courierName?: string;
  restaurantName: string;
  location: FoodPickupRestaurantLocation;
  publicLocation?: FoodPickupRestaurantPublicLocation;
  cuisineTags?: string[];
  notes?: string;
  pickupHours?: string;
  photoUrl?: string;
  photoStoragePath?: string;
  isPublic?: boolean;
}

export interface FoodPickupRestaurantDoc {
  id: string;
  courierUid?: string;
  courierId?: string; // legacy
  courierName?: string | null;
  restaurantName: string;
  location: FoodPickupRestaurantLocation;
  publicLocation?: FoodPickupRestaurantPublicLocation;
  cuisineTags: string[];
  notes?: string | null;
  pickupHours?: string | null;
  photoUrl?: string | null;
  photoStoragePath?: string | null;
  isPublic: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
} 

interface ParsedAddress {
  city?: string;
  state?: string;
  zipCode?: string;
}

const US_STATE_NAMES = new Set([
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut", "delaware",
  "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa", "kansas", "kentucky",
  "louisiana", "maine", "maryland", "massachusetts", "michigan", "minnesota", "mississippi",
  "missouri", "montana", "nebraska", "nevada", "new hampshire", "new jersey", "new mexico",
  "new york", "north carolina", "north dakota", "ohio", "oklahoma", "oregon", "pennsylvania",
  "rhode island", "south carolina", "south dakota", "tennessee", "texas", "utah", "vermont",
  "virginia", "washington", "west virginia", "wisconsin", "wyoming", "district of columbia",
]);

const reverseCityCache = new Map<string, { city?: string; state?: string; zipCode?: string; cityZip?: string } | null>();
const zipCityCache = new Map<string, { city?: string; state?: string } | null>();

function cleanCityCandidate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (/\d{5}(?:-\d{4})?/.test(trimmed)) return undefined;
  if (/^[A-Za-z]{2}$/.test(trimmed)) return undefined;
  if (US_STATE_NAMES.has(trimmed.toLowerCase())) return undefined;
  return trimmed;
}

function formatCityStateZip(city?: string | null, state?: string | null, zipCode?: string | null): string | undefined {
  const cleanCity = cleanCityCandidate(city);
  const cleanState = state?.trim();
  const cleanZip = zipCode?.trim();
  if (cleanCity && cleanState && cleanZip) return `${cleanCity}, ${cleanState} ${cleanZip}`;
  if (cleanCity && cleanZip) return `${cleanCity} ${cleanZip}`;
  if (cleanCity && cleanState) return `${cleanCity}, ${cleanState}`;
  if (cleanCity) return cleanCity;
  if (cleanState && cleanZip) return `${cleanState} ${cleanZip}`;
  if (cleanZip) return cleanZip;
  if (cleanState) return cleanState;
  return undefined;
}

function needsCityEnrichment(restaurant: FoodPickupRestaurantDoc): boolean {
  const city = cleanCityCandidate(restaurant.publicLocation?.city);
  if (city) return false;
  return Number.isFinite(restaurant.location?.lat) && Number.isFinite(restaurant.location?.lng);
}

async function resolveCityFromZip(zipCode: string | undefined | null): Promise<{ city?: string; state?: string } | null> {
  const normalizedZip = (zipCode || "").trim().match(/^(\d{5})/)?.[1];
  if (!normalizedZip) return null;
  if (zipCityCache.has(normalizedZip)) {
    return zipCityCache.get(normalizedZip) || null;
  }

  try {
    const response = await fetch(`https://api.zippopotam.us/us/${normalizedZip}`);
    if (!response.ok) {
      zipCityCache.set(normalizedZip, null);
      return null;
    }
    const data = await response.json();
    const place = Array.isArray(data?.places) ? data.places[0] : null;
    const resolved = {
      city: cleanCityCandidate(place?.["place name"]),
      state: typeof place?.["state abbreviation"] === "string" ? place["state abbreviation"] : undefined,
    };
    zipCityCache.set(normalizedZip, resolved);
    return resolved;
  } catch {
    zipCityCache.set(normalizedZip, null);
    return null;
  }
}

function parseAddress(address: string): ParsedAddress {
  const cleaned = address.trim();
  if (!cleaned) return {};
  const parts = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
  const cityFromParts = cleanCityCandidate(parts.length >= 3 ? parts[parts.length - 2] : undefined);
  const stateZip = parts.length >= 1 ? parts[parts.length - 1] : "";
  const strictMatch = stateZip.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (strictMatch) {
    return {
      city: cityFromParts,
      state: strictMatch[1].toUpperCase(),
      zipCode: strictMatch[2],
    };
  }

  // Handles strings like "... Washington DC 20001" (without commas around city).
  const inlineMatch = cleaned.match(/\b([A-Za-z][A-Za-z .'-]+?)\s+([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)\b/);
  if (!inlineMatch) {
    const looseZip = cleaned.match(/\b(\d{5}(?:-\d{4})?)\b/);
    return { city: cityFromParts, zipCode: looseZip?.[1] };
  }

  const city = cleanCityCandidate(inlineMatch[1]?.trim().split(/\s+/).slice(-2).join(" "));
  return {
    city: city || cityFromParts,
    state: inlineMatch[2].toUpperCase(),
    zipCode: inlineMatch[3],
  };
}

export function toCityZipLabel(input: {
  location: { address: string };
  publicLocation?: { city?: string; state?: string; zipCode?: string; cityZip?: string };
}): string {
  const publicLocation = input.publicLocation || {};
  const fromDoc = publicLocation.cityZip?.trim();
  const cityFromDoc = cleanCityCandidate(publicLocation.city);
  const zipOnly = /^\d{5}(?:-\d{4})?$/.test(fromDoc || "");
  const stateZipOnly = /^[A-Za-z .'-]+\s+\d{5}(?:-\d{4})?$/.test(fromDoc || "");
  if (fromDoc && !zipOnly && !stateZipOnly && cityFromDoc) return fromDoc;

  const city = cityFromDoc;
  const state = publicLocation.state?.trim();
  const zipCode = publicLocation.zipCode?.trim();
  const formatted = formatCityStateZip(city, state, zipCode);
  if (formatted) return formatted;

  const parsed = parseAddress(input.location.address);
  const parsedFormatted = formatCityStateZip(parsed.city, parsed.state, parsed.zipCode);
  if (parsedFormatted) return parsedFormatted;
  if (fromDoc) return fromDoc;
  return "Location available after booking";
}

export async function createFoodPickupRestaurant(input: FoodPickupRestaurantInput): Promise<string> {
  if (!isFirebaseReady() || !db) {
    throw new Error("Firebase is not ready.");
  }

  const restaurantName = input.restaurantName.trim();
  const address = input.location.address.trim();
  const cuisineTags = (input.cuisineTags ?? [])
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 8);

  if (!restaurantName) {
    throw new Error("Restaurant name is required.");
  }

  if (!address) {
    throw new Error("Restaurant address is required.");
  }

  const parsed = parseAddress(address);
  let city = cleanCityCandidate(input.publicLocation?.city?.trim()) || cleanCityCandidate(parsed.city) || null;
  let state = input.publicLocation?.state?.trim() || parsed.state || null;
  const zipCode = input.publicLocation?.zipCode?.trim() || parsed.zipCode || null;
  if (!city && zipCode) {
    const zipResolved = await resolveCityFromZip(zipCode);
    city = zipResolved?.city || city;
    state = state || zipResolved?.state || null;
  }
  const cityZip =
    formatCityStateZip(city, state, zipCode) ||
    formatCityStateZip(input.publicLocation?.city, input.publicLocation?.state, input.publicLocation?.zipCode) ||
    input.publicLocation?.cityZip?.trim() ||
    null;

  const docRef = await addDoc(collection(db, "foodPickupRestaurants"), {
    courierUid: input.courierUid ?? input.courierId ?? null,
    courierName: input.courierName?.trim() || null,
    restaurantName,
    location: {
      address,
      lat: input.location.lat,
      lng: input.location.lng,
    },
    publicLocation: {
      city,
      state,
      zipCode,
      cityZip: cityZip || city || zipCode || "Location shared",
    },
    cuisineTags,
    notes: input.notes?.trim() || null,
    pickupHours: input.pickupHours?.trim() || null,
    photoUrl: input.photoUrl?.trim() || null,
    photoStoragePath: input.photoStoragePath?.trim() || null,
    isPublic: input.isPublic ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export function useFoodPickupRestaurants() {
  const [restaurants, setRestaurants] = useState<FoodPickupRestaurantDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isFirebaseReady() || !db) {
      setRestaurants([]);
      setLoading(false);
      return;
    }

    const restaurantsRef = collection(db, "foodPickupRestaurants");
    const restaurantsQuery = query(restaurantsRef, where("isPublic", "==", true));

    const unsubscribe = onSnapshot(
      restaurantsQuery,
      (snapshot) => {
        const docs: FoodPickupRestaurantDoc[] = snapshot.docs
          .map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<FoodPickupRestaurantDoc, "id">),
          }))
          .sort((a, b) => {
            const aMs = (a.updatedAt as any)?.toMillis?.() ?? 0;
            const bMs = (b.updatedAt as any)?.toMillis?.() ?? 0;
            return bMs - aMs;
          });
        setRestaurants(docs);
        setLoading(false);
        setError(null);

        void (async () => {
          const unresolved = docs.filter(needsCityEnrichment);
          if (!unresolved.length) return;

          const resolvedDocs = await Promise.all(
            docs.map(async (restaurant) => {
              if (!needsCityEnrichment(restaurant)) return restaurant;
              const key = `${restaurant.location.lat.toFixed(5)},${restaurant.location.lng.toFixed(5)}`;
              let reverse = reverseCityCache.get(key);
              if (reverse === undefined) {
                reverse = await reverseGeocodeLocation(restaurant.location.lat, restaurant.location.lng);
                reverseCityCache.set(key, reverse);
              }
              if (!reverse) return restaurant;

              const mergedPublic = {
                ...restaurant.publicLocation,
                city: cleanCityCandidate(restaurant.publicLocation?.city) || reverse.city || restaurant.publicLocation?.city,
                state: restaurant.publicLocation?.state || reverse.state,
                zipCode: restaurant.publicLocation?.zipCode || reverse.zipCode,
              };
              if (!cleanCityCandidate(mergedPublic.city) && mergedPublic.zipCode) {
                const zipResolved = await resolveCityFromZip(mergedPublic.zipCode);
                if (zipResolved?.city) mergedPublic.city = zipResolved.city;
                if (!mergedPublic.state && zipResolved?.state) mergedPublic.state = zipResolved.state;
              }
              return {
                ...restaurant,
                publicLocation: {
                  ...mergedPublic,
                  cityZip:
                    formatCityStateZip(mergedPublic.city, mergedPublic.state, mergedPublic.zipCode) ||
                    restaurant.publicLocation?.cityZip ||
                    reverse.cityZip ||
                    "Location shared",
                },
              };
            }),
          );
          setRestaurants(resolvedDocs);
        })();
      },
      (snapshotError) => {
        console.error("Failed to listen for food pickup restaurants:", snapshotError);
        setError(snapshotError as Error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { restaurants, loading, error };
}

export function useFoodPickupRestaurant(restaurantId: string | null) {
  const [restaurant, setRestaurant] = useState<FoodPickupRestaurantDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!restaurantId || !isFirebaseReady() || !db) {
      setRestaurant(null);
      setLoading(false);
      return;
    }

    const restaurantRef = doc(db, "foodPickupRestaurants", restaurantId);
    const unsubscribe = onSnapshot(
      restaurantRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          setRestaurant(null);
          setLoading(false);
          return;
        }
        const restaurantDoc: FoodPickupRestaurantDoc = {
          id: snapshot.id,
          ...(snapshot.data() as Omit<FoodPickupRestaurantDoc, "id">),
        };
        setRestaurant(restaurantDoc);
        setLoading(false);
        setError(null);

        void (async () => {
          if (!needsCityEnrichment(restaurantDoc)) return;
          const key = `${restaurantDoc.location.lat.toFixed(5)},${restaurantDoc.location.lng.toFixed(5)}`;
          let reverse = reverseCityCache.get(key);
          if (reverse === undefined) {
            reverse = await reverseGeocodeLocation(restaurantDoc.location.lat, restaurantDoc.location.lng);
            reverseCityCache.set(key, reverse);
          }
          if (!reverse) return;
          setRestaurant((current) => {
            if (!current) return current;
            const mergedPublic = {
              ...current.publicLocation,
              city: cleanCityCandidate(current.publicLocation?.city) || reverse?.city || current.publicLocation?.city,
              state: current.publicLocation?.state || reverse?.state,
              zipCode: current.publicLocation?.zipCode || reverse?.zipCode,
            };
            const buildRestaurant = () => ({
              ...current,
              publicLocation: {
                ...mergedPublic,
                cityZip:
                  formatCityStateZip(mergedPublic.city, mergedPublic.state, mergedPublic.zipCode) ||
                  current.publicLocation?.cityZip ||
                  reverse?.cityZip ||
                  "Location shared",
              },
            });
            if (cleanCityCandidate(mergedPublic.city) || !mergedPublic.zipCode) {
              return buildRestaurant();
            }
            void resolveCityFromZip(mergedPublic.zipCode).then((zipResolved) => {
              if (!zipResolved?.city) return;
              setRestaurant((latest) => {
                if (!latest) return latest;
                const latestPublic = {
                  ...latest.publicLocation,
                  city: cleanCityCandidate(latest.publicLocation?.city) || zipResolved.city,
                  state: latest.publicLocation?.state || zipResolved.state,
                  zipCode: latest.publicLocation?.zipCode || mergedPublic.zipCode,
                };
                return {
                  ...latest,
                  publicLocation: {
                    ...latestPublic,
                    cityZip:
                      formatCityStateZip(latestPublic.city, latestPublic.state, latestPublic.zipCode) ||
                      latest.publicLocation?.cityZip ||
                      "Location shared",
                  },
                };
              });
            });
            return buildRestaurant();
          });
        })();
      },
      (snapshotError) => {
        console.error("Failed to load food pickup restaurant:", snapshotError);
        setError(snapshotError as Error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [restaurantId]);

  return { restaurant, loading, error };
}

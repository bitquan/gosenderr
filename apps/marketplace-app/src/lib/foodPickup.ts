import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db, isFirebaseReady } from "@/lib/firebase/client";
import { FoodPickupRestaurantDoc, FoodPickupRestaurantInput } from "@gosenderr/shared";

interface ParsedAddress {
  city?: string;
  state?: string;
  zipCode?: string;
}

function parseAddress(address: string): ParsedAddress {
  const cleaned = address.trim();
  if (!cleaned) return {};
  const parts = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
  const city = parts.length >= 2 ? parts[parts.length - 2] : undefined;
  const stateZip = parts.length >= 1 ? parts[parts.length - 1] : "";
  const match = stateZip.match(/^([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  if (!match) return { city };
  return {
    city,
    state: match[1].toUpperCase(),
    zipCode: match[2],
  };
}

export function toCityZipLabel(input: {
  location: { address: string };
  publicLocation?: { city?: string; state?: string; zipCode?: string; cityZip?: string };
}): string {
  const publicLocation = input.publicLocation || {};
  const fromDoc = publicLocation.cityZip?.trim();
  if (fromDoc) return fromDoc;

  const city = publicLocation.city?.trim();
  const zipCode = publicLocation.zipCode?.trim();
  if (city && zipCode) return `${city} ${zipCode}`;
  if (city) return city;
  if (zipCode) return zipCode;

  const parsed = parseAddress(input.location.address);
  if (parsed.city && parsed.zipCode) return `${parsed.city} ${parsed.zipCode}`;
  if (parsed.city) return parsed.city;
  if (parsed.zipCode) return parsed.zipCode;
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
  const cityZip = [parsed.city, parsed.zipCode].filter(Boolean).join(" ").trim();

  const docRef = await addDoc(collection(db, "foodPickupRestaurants"), {
    courierId: input.courierId,
    courierName: input.courierName?.trim() || null,
    restaurantName,
    location: {
      address,
      lat: input.location.lat,
      lng: input.location.lng,
    },
    publicLocation: {
      city: parsed.city || null,
      state: parsed.state || null,
      zipCode: parsed.zipCode || null,
      cityZip: cityZip || "Location shared",
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
    const restaurantsQuery = query(
      restaurantsRef,
      where("isPublic", "==", true),
      orderBy("updatedAt", "desc"),
    );

    const unsubscribe = onSnapshot(
      restaurantsQuery,
      (snapshot) => {
        const docs: FoodPickupRestaurantDoc[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FoodPickupRestaurantDoc, "id">),
        }));
        setRestaurants(docs);
        setLoading(false);
        setError(null);
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
        setRestaurant({
          id: snapshot.id,
          ...(snapshot.data() as Omit<FoodPickupRestaurantDoc, "id">),
        });
        setLoading(false);
        setError(null);
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

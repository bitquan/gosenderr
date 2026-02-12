import {
  addDoc,
  collection,
  doc,
  getDoc,
  query,
  serverTimestamp,
  updateDoc,
  getDocs,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  FoodPickupRestaurantDoc,
  FoodPickupRestaurantInput,
} from "@gosenderr/shared";

const RESTAURANTS_COLLECTION = "foodPickupRestaurants";

export async function createFoodPickupRestaurant(
  input: FoodPickupRestaurantInput,
): Promise<string> {
  const restaurantsRef = collection(db, RESTAURANTS_COLLECTION);
  const payload = {
    ...input,
    cuisineTags: input.cuisineTags ?? [],
    isPublic: input.isPublic ?? true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const docRef = await addDoc(restaurantsRef, payload);
  return docRef.id;
}

export async function updateFoodPickupRestaurant(
  restaurantId: string,
  input: Partial<FoodPickupRestaurantInput> & {
    photoUrl?: string;
    photoStoragePath?: string;
    lastUsedByUid?: string;
    lastUsedAt?: ReturnType<typeof serverTimestamp>;
  },
): Promise<void> {
  const restaurantRef = doc(db, RESTAURANTS_COLLECTION, restaurantId);
  const payload: Record<string, unknown> = {
    ...input,
    ...(input.cuisineTags && { cuisineTags: input.cuisineTags }),
    updatedAt: serverTimestamp(),
  };
  await updateDoc(restaurantRef, payload);
}

export async function listFoodPickupRestaurantsByCourier(
  courierId: string,
): Promise<FoodPickupRestaurantDoc[]> {
  const restaurantsRef = collection(db, RESTAURANTS_COLLECTION);
  const q = query(restaurantsRef, where("courierId", "==", courierId));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data() as Omit<FoodPickupRestaurantDoc, "id">;
      return {
        id: docSnap.id,
        ...data,
      };
    })
    .sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() ?? 0;
      const bTime = b.updatedAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

export async function listPublicFoodPickupRestaurants(): Promise<
  FoodPickupRestaurantDoc[]
> {
  const restaurantsRef = collection(db, RESTAURANTS_COLLECTION);
  const q = query(restaurantsRef, where("isPublic", "==", true));
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((docSnap) => {
      const data = docSnap.data() as Omit<FoodPickupRestaurantDoc, "id">;
      return {
        id: docSnap.id,
        ...data,
      };
    })
    .sort((a, b) => {
      const aTime = a.updatedAt?.toMillis?.() ?? 0;
      const bTime = b.updatedAt?.toMillis?.() ?? 0;
      return bTime - aTime;
    });
}

export async function getFoodPickupRestaurantById(
  restaurantId: string,
): Promise<FoodPickupRestaurantDoc | null> {
  const restaurantRef = doc(db, RESTAURANTS_COLLECTION, restaurantId);
  const snapshot = await getDoc(restaurantRef);
  if (!snapshot.exists()) {
    return null;
  }
  const data = snapshot.data() as Omit<FoodPickupRestaurantDoc, "id">;
  return { id: snapshot.id, ...data };
}

import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { db } from '@/lib/firebase/client'
import { FoodPickupRestaurantDoc } from '@gosenderr/shared'

export function useFoodPickupRestaurants() {
  const [restaurants, setRestaurants] = useState<FoodPickupRestaurantDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      const restaurantsRef = collection(db, 'foodPickupRestaurants')
      const q = query(restaurantsRef, where('isPublic', '==', true))
      const snapshot = await getDocs(q)

      const docs: FoodPickupRestaurantDoc[] = snapshot.docs
        .map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FoodPickupRestaurantDoc, 'id'>),
        }))
        .sort((a, b) => {
          const aTime = a.updatedAt?.toMillis?.() ?? 0
          const bTime = b.updatedAt?.toMillis?.() ?? 0
          return bTime - aTime
        })

      setRestaurants(docs)
      setError(null)
    } catch (err) {
      console.error('Failed to load food pickup restaurants:', err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { restaurants, loading, error, refresh }
}

export async function markFoodPickupRestaurantUsed(
  restaurantId: string,
  userId: string,
) {
  const restaurantRef = doc(db, 'foodPickupRestaurants', restaurantId)
  await updateDoc(restaurantRef, {
    lastUsedByUid: userId,
    lastUsedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

interface CustomerRestaurantInput {
  restaurantName: string
  address: string
  lat: number
  lng: number
  cuisineTags?: string[]
  notes?: string
  pickupHours?: string
  photoUrl?: string
}

export async function createFoodPickupRestaurantFromMarketplace(
  userId: string,
  contributorName: string,
  input: CustomerRestaurantInput,
) {
  const restaurantsRef = collection(db, 'foodPickupRestaurants')
  const cleanTags = (input.cuisineTags || [])
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)

  await addDoc(restaurantsRef, {
    courierId: userId,
    courierName: contributorName,
    restaurantName: input.restaurantName.trim(),
    location: {
      address: input.address.trim(),
      lat: input.lat,
      lng: input.lng,
    },
    cuisineTags: cleanTags,
    notes: input.notes?.trim() || '',
    pickupHours: input.pickupHours?.trim() || '',
    photoUrl: input.photoUrl?.trim() || '',
    isPublic: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase/client'
import { FoodPickupRestaurantDoc } from '@gosenderr/shared'

export function useFoodPickupRestaurants() {
  const [restaurants, setRestaurants] = useState<FoodPickupRestaurantDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadRestaurants = async () => {
      try {
        const restaurantsRef = collection(db, 'foodPickupRestaurants')
        const q = query(restaurantsRef, where('isPublic', '==', true))
        const snapshot = await getDocs(q)
        if (cancelled) return

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
        if (cancelled) return
        console.error('Failed to load food pickup restaurants:', err)
        setError(err as Error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadRestaurants()

    return () => {
      cancelled = true
    }
  }, [])

  return { restaurants, loading, error }
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

import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase/client'
import { FoodPickupRestaurantDoc } from '@gosenderr/shared'

export function useFoodPickupRestaurants() {
  const [restaurants, setRestaurants] = useState<FoodPickupRestaurantDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const restaurantsRef = collection(db, 'foodPickupRestaurants')
    const q = query(
      restaurantsRef,
      where('isPublic', '==', true),
      orderBy('updatedAt', 'desc'),
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: FoodPickupRestaurantDoc[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as FoodPickupRestaurantDoc),
        }))
        setRestaurants(docs)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Failed to listen for food pickup restaurants:', err)
        setError(err)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  return { restaurants, loading, error }
}

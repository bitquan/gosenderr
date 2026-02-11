import { useEffect, useState } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

export function useSellerProfile(sellerId: string) {
  const [profile, setProfile] = useState<any | null>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      setLoading(true)
      // Placeholder: fetch seller public profile
      try {
        const userSnap = await getDocs(query(collection(db, 'users'), where('__name__', '==', sellerId)))
        const user = userSnap.docs[0]?.data?.() || null
        const itemsSnap = await getDocs(query(collection(db, 'items'), where('sellerId', '==', sellerId)))
        const sellerItems = itemsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        if (mounted) {
          setProfile(user)
          setItems(sellerItems)
        }
      } catch (err) {
        console.error('useSellerProfile load error', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [sellerId])

  return { profile, items, loading }
}

export default useSellerProfile

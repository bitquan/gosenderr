import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase/client'

export interface PlatformPaymentSettings {
  platformCommissionRate: number
  vendorPayoutSchedule: 'daily' | 'weekly' | 'monthly'
  minimumPayoutAmount: number
  autoPayouts: boolean
  paymentMethods: {
    card: boolean
    applePay: boolean
    googlePay: boolean
  }
  currency: string
  taxRate: number
  collectTax: boolean
  platformFeePackage: number
  platformFeeFood: number
}

const DEFAULTS: PlatformPaymentSettings = {
  platformCommissionRate: 10,
  vendorPayoutSchedule: 'weekly',
  minimumPayoutAmount: 50,
  autoPayouts: true,
  paymentMethods: { card: true, applePay: true, googlePay: true },
  currency: 'USD',
  taxRate: 0,
  collectTax: false,
  platformFeePackage: 2.5,
  platformFeeFood: 1.5,
}

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformPaymentSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadSettings = async () => {
      try {
        const snapshot = await getDoc(doc(db, 'platformSettings', 'payment'))
        if (cancelled) return

        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<PlatformPaymentSettings>
          setSettings({ ...DEFAULTS, ...data })
        } else {
          setSettings(DEFAULTS)
        }
        setError(null)
      } catch (err) {
        if (cancelled) return
        const firestoreCode = (err as { code?: string } | null)?.code
        if (firestoreCode === 'permission-denied') {
          // Non-admin users may not read platform settings in some environments.
          // Use safe defaults so customer flows continue to function.
          setSettings(DEFAULTS)
          setError(null)
        } else {
          console.error('Error loading platform settings:', err)
          setError(err as Error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadSettings()

    return () => {
      cancelled = true
    }
  }, [])

  return { settings, loading, error }
}

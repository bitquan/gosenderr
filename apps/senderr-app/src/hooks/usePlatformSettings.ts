import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
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
    const unsubscribe = onSnapshot(
      doc(db, 'platformSettings', 'payment'),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as Partial<PlatformPaymentSettings>
          setSettings({ ...DEFAULTS, ...data })
        } else {
          setSettings(DEFAULTS)
        }
        setLoading(false)
      },
      (err) => {
        console.error('Error loading platform settings:', err)
        setError(err as Error)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [])

  return { settings, loading, error }
}

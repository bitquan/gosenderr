import { useEffect, useState } from 'react'
import { getPublicConfig } from '@/lib/publicConfig'

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
  deliveryBaseFee: number
  deliveryPerMileFee: number
  deliveryPerStopFee: number
  deliveryMinimumFee: number
  orderAdFeeEnabled: boolean
  orderAdFeeFlat: number
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
  deliveryBaseFee: 3.99,
  deliveryPerMileFee: 0.85,
  deliveryPerStopFee: 0.65,
  deliveryMinimumFee: 4.99,
  orderAdFeeEnabled: false,
  orderAdFeeFlat: 0,
}

export function usePlatformSettings() {
  const [settings, setSettings] = useState<PlatformPaymentSettings>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const config = await getPublicConfig()
        if (cancelled) return

        const overrides: Partial<PlatformPaymentSettings> = {}
        if (typeof config.platformFeePackage === 'number') {
          overrides.platformFeePackage = config.platformFeePackage
        }
        if (typeof config.platformFeeFood === 'number') {
          overrides.platformFeeFood = config.platformFeeFood
        }
        if (typeof config.deliveryBaseFee === 'number') {
          overrides.deliveryBaseFee = config.deliveryBaseFee
        }
        if (typeof config.deliveryPerMileFee === 'number') {
          overrides.deliveryPerMileFee = config.deliveryPerMileFee
        }
        if (typeof config.deliveryPerStopFee === 'number') {
          overrides.deliveryPerStopFee = config.deliveryPerStopFee
        }
        if (typeof config.deliveryMinimumFee === 'number') {
          overrides.deliveryMinimumFee = config.deliveryMinimumFee
        }
        if (typeof config.orderAdFeeEnabled === 'boolean') {
          overrides.orderAdFeeEnabled = config.orderAdFeeEnabled
        }
        if (typeof config.orderAdFeeFlat === 'number') {
          overrides.orderAdFeeFlat = config.orderAdFeeFlat
        }
        if (typeof config.collectTax === 'boolean') {
          overrides.collectTax = config.collectTax
        }
        if (typeof config.taxRate === 'number') {
          overrides.taxRate = config.taxRate
        }

        if (Object.keys(overrides).length > 0) {
          setSettings((current) => ({ ...current, ...overrides }))
        } else {
          setSettings(DEFAULTS)
        }
      } catch (err) {
        if (cancelled) return
        setSettings(DEFAULTS)
        setError(err as Error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  return { settings, loading, error }
}

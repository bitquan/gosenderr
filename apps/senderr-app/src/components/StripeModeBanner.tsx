import { useEffect, useState } from 'react'
import { getPublicConfig } from '../lib/publicConfig'

export function StripeModeBanner() {
  const [stripeMode, setStripeMode] = useState<'test' | 'live' | null>(null)

  useEffect(() => {
    let active = true

    const loadConfig = async () => {
      const config = await getPublicConfig()
      if (!active) return
      setStripeMode(config.stripeMode || null)
    }

    loadConfig()

    return () => {
      active = false
    }
  }, [])

  if (stripeMode !== 'test') return null

  return (
    <div
      className="sticky top-0 z-50 w-full bg-amber-500 text-white text-xs sm:text-sm px-4 py-2 text-center"
      role="status"
    >
      ⚠️ Stripe is in TEST mode — real payments are disabled.
    </div>
  )
}

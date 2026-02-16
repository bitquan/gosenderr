export type CourierShellNavItem = {
  label: string
  href: string
  icon: string
  description?: string
}

export type CourierShellNavSection = {
  title: string
  items: CourierShellNavItem[]
}

const CORE_ITEMS: CourierShellNavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠', description: 'Job board + status' },
  { label: 'Jobs', href: '/jobs', icon: '📦', description: 'Active + history' },
  { label: 'Routes', href: '/routes', icon: '🗺️', description: 'Route opportunities' },
]

const SYSTEM_ITEMS: CourierShellNavItem[] = [
  { label: 'Earnings', href: '/earnings', icon: '💰', description: 'Totals and payouts' },
  { label: 'Rate Cards', href: '/rate-cards', icon: '🧾', description: 'Pricing controls' },
  { label: 'Equipment', href: '/equipment', icon: '🎒', description: 'Courier gear status' },
  { label: 'Settings', href: '/settings', icon: '⚙️', description: 'Account + payout mode' },
  { label: 'Support', href: '/support', icon: '🛟', description: 'Help center' },
]

export const COURIER_SHELL_SECTIONS: CourierShellNavSection[] = [
  { title: 'Core', items: CORE_ITEMS },
  { title: 'Systems', items: SYSTEM_ITEMS },
]

export const COURIER_SHELL_ITEMS: CourierShellNavItem[] = [...CORE_ITEMS, ...SYSTEM_ITEMS]

export function resolveCourierShellTitle(pathname: string): string {
  return (
    COURIER_SHELL_ITEMS.find(
      (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
    )?.label ?? 'Courier'
  )
}

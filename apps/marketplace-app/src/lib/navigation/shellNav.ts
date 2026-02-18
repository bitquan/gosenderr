export type MarketplaceShellNavItem = {
  label: string
  href: string
  icon?: string
  description?: string
}

export type MarketplaceShellNavSection = {
  title: string
  items: MarketplaceShellNavItem[]
}

const CORE_NAV: MarketplaceShellNavItem[] = [
  { label: 'Browse', href: '/marketplace', icon: '🏠', description: 'Explore listings' },
  { label: 'Sell', href: '/marketplace/sell', icon: '🏪', description: 'Create a listing' },
  { label: 'Messages', href: '/messages', icon: '💬', description: 'Chat with buyers' },
  { label: 'Profile', href: '/profile', icon: '👤', description: 'Account settings' },
]

const DELIVERY_NAV: MarketplaceShellNavItem[] = [
  { label: 'Send Packages', href: '/jobs', icon: '📦', description: 'Schedule a send' },
  { label: 'Pickup Food', href: '/food-pickups', icon: '🍱', description: 'Browse food pickup spots' },
  { label: 'Ship', href: '/ship', icon: '🚚', description: 'Custom courier jobs' },
]

const CUSTOMER_DASHBOARD_NAV: MarketplaceShellNavItem[] = [
  { label: 'Customer Dashboard', href: '/dashboard', icon: '📊' },
]

const SELLER_DASHBOARD_NAV: MarketplaceShellNavItem[] = [
  { label: 'Seller Dashboard', href: '/seller/dashboard', icon: '🏬' },
]

const HEADER_PUBLIC_NAV: MarketplaceShellNavItem[] = [
  { label: 'Browse', href: '/marketplace' },
  { label: 'Food pickup', href: '/food-pickups' },
]

const HEADER_AUTH_NAV: MarketplaceShellNavItem[] = [
  { label: 'Sell', href: '/marketplace/sell' },
  { label: 'Orders', href: '/orders' },
  { label: 'Ship', href: '/request-delivery' },
]

export function getMarketplaceHeaderNav(isSignedIn: boolean): MarketplaceShellNavItem[] {
  return isSignedIn ? [...HEADER_PUBLIC_NAV, ...HEADER_AUTH_NAV] : HEADER_PUBLIC_NAV
}

export function getMarketplaceSidebarSections(
  isCustomer: boolean,
  isSeller: boolean,
  isAdmin: boolean = false
): MarketplaceShellNavSection[] {
  const dashboardItems: MarketplaceShellNavItem[] = [
    ...(isCustomer ? CUSTOMER_DASHBOARD_NAV : []),
    ...(isSeller || isAdmin ? SELLER_DASHBOARD_NAV : []),
  ]

  const sections: Array<MarketplaceShellNavSection & { visible: boolean }> = [
    { title: 'Core', items: CORE_NAV, visible: true },
    { title: 'Delivery', items: DELIVERY_NAV, visible: isCustomer },
    { title: 'Dashboards', items: dashboardItems, visible: dashboardItems.length > 0 },
  ]

  return sections.filter((section) => section.visible)
}

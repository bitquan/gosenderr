export const ADMIN_PATHS = {
  login: '/login',
  root: '/',
  dashboard: '/dashboard',
  users: '/users',
  userDetail: '/users/:userId',
  jobs: '/jobs',
  rateCardsComparison: '/rate-cards-comparison',
  disputes: '/disputes',
  courierApproval: '/courier-approval',
  sellerApproval: '/seller-approval',
  revenue: '/revenue',
  messaging: '/messaging',
  marketplace: '/marketplace',
  marketplaceItemDetail: '/marketplace/:itemId',
  flaggedContent: '/flagged-content',
  marketplaceOrders: '/marketplace-orders',
  marketplaceOrderDetail: '/marketplace-orders/:orderId',
  categories: '/categories',
  systemCheck: '/system-check',
  auditLogs: '/audit-logs',
  featureFlags: '/feature-flags',
  adminFlowLogs: '/admin-flow-logs',
  settings: '/settings',
  paymentSettings: '/settings/payment',
  secrets: '/settings/secrets',
  emailSettings: '/settings/email',
  securitySettings: '/settings/security',
} as const

export type AdminNavItem = {
  label: string
  path: string
  icon: string
  badge?: number
  matchPrefixes?: string[]
}

export type AdminNavGroup = {
  title: string
  items: AdminNavItem[]
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', path: ADMIN_PATHS.dashboard, icon: '🏠' }],
  },
  {
    title: 'User Management',
    items: [
      {
        label: 'Users',
        path: ADMIN_PATHS.users,
        icon: '👥',
        matchPrefixes: ['/users/'],
      },
      { label: 'Courier Approval', path: ADMIN_PATHS.courierApproval, icon: '⚡' },
      { label: 'Seller Approval', path: ADMIN_PATHS.sellerApproval, icon: '🏪' },
    ],
  },
  {
    title: 'Communications',
    items: [
      { label: 'Messaging', path: ADMIN_PATHS.messaging, icon: '💬' },
      { label: 'Disputes', path: ADMIN_PATHS.disputes, icon: '⚖️' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Jobs', path: ADMIN_PATHS.jobs, icon: '📦' },
      { label: 'Courier Rates', path: ADMIN_PATHS.rateCardsComparison, icon: '💲' },
    ],
  },
  {
    title: 'Marketplace',
    items: [
      {
        label: 'Items',
        path: ADMIN_PATHS.marketplace,
        icon: '🛍️',
        matchPrefixes: ['/marketplace/'],
      },
      { label: 'Flagged Content', path: ADMIN_PATHS.flaggedContent, icon: '🚩' },
      {
        label: 'Orders',
        path: ADMIN_PATHS.marketplaceOrders,
        icon: '📦',
        matchPrefixes: ['/marketplace-orders/'],
      },
      { label: 'Categories', path: ADMIN_PATHS.categories, icon: '📁' },
    ],
  },
  {
    title: 'Finance',
    items: [{ label: 'Revenue', path: ADMIN_PATHS.revenue, icon: '💰' }],
  },
  {
    title: 'System',
    items: [
      { label: 'System Check', path: ADMIN_PATHS.systemCheck, icon: '🔧' },
      { label: 'Audit Logs', path: ADMIN_PATHS.auditLogs, icon: '📋' },
      { label: 'Feature Flags', path: ADMIN_PATHS.featureFlags, icon: '🎚️' },
      { label: 'Secrets', path: ADMIN_PATHS.secrets, icon: '🔑' },
      { label: 'Admin Flow Logs', path: ADMIN_PATHS.adminFlowLogs, icon: '🧪' },
      { label: 'Settings', path: ADMIN_PATHS.settings, icon: '⚙️' },
    ],
  },
]

export function isAdminNavItemActive(pathname: string, item: AdminNavItem): boolean {
  if (pathname === item.path) {
    return true
  }

  if (!item.matchPrefixes) {
    return false
  }

  return item.matchPrefixes.some((prefix) => pathname.startsWith(prefix))
}

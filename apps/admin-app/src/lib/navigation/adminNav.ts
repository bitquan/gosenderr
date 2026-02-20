export interface AdminNavItem {
  label: string
  path: string
  icon: string
  badge?: number
}

export interface AdminNavGroup {
  title: string
  items: AdminNavItem[]
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', path: '/dashboard', icon: '🏠' }],
  },
  {
    title: 'User Management',
    items: [
      { label: 'Users', path: '/users', icon: '👥' },
      { label: 'Courier Approval', path: '/courier-approval', icon: '⚡' },
      { label: 'Seller Approval', path: '/seller-approval', icon: '🏪' },
    ],
  },
  {
    title: 'Communications',
    items: [
      { label: 'Messaging', path: '/messaging', icon: '💬' },
      { label: 'Disputes', path: '/disputes', icon: '⚖️' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { label: 'Jobs', path: '/jobs', icon: '📦' },
      { label: 'Courier Rates', path: '/rate-cards-comparison', icon: '💲' },
    ],
  },
  {
    title: 'Marketplace',
    items: [
      { label: 'Items', path: '/marketplace', icon: '🛍️' },
      { label: 'Flagged Content', path: '/flagged-content', icon: '🚩' },
      { label: 'Orders', path: '/marketplace-orders', icon: '📦' },
      { label: 'Categories', path: '/categories', icon: '📁' },
    ],
  },
  {
    title: 'Finance',
    items: [{ label: 'Revenue', path: '/revenue', icon: '💰' }],
  },
  {
    title: 'System',
    items: [
      { label: 'System Check', path: '/system-check', icon: '🔧' },
      { label: 'Audit Logs', path: '/audit-logs', icon: '📋' },
      { label: 'Feature Flags', path: '/feature-flags', icon: '🎚️' },
      { label: 'Secrets', path: '/settings/secrets', icon: '🔑' },
      { label: 'Admin Flow Logs', path: '/admin-flow-logs', icon: '🧪' },
      { label: 'Settings', path: '/settings', icon: '⚙️' },
    ],
  },
]

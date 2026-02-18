import { useLocation } from 'react-router-dom'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  users: 'Users',
  jobs: 'Jobs',
  disputes: 'Disputes',
  revenue: 'Revenue',
  marketplace: 'Marketplace',
  'marketplace-orders': 'Orders',
  categories: 'Categories',
  messaging: 'Messaging',
  'system-check': 'System Check',
  'audit-logs': 'Audit Logs',
  'feature-flags': 'Feature Flags',
  'admin-flow-logs': 'Admin Flow Logs',
  settings: 'Settings',
  secrets: 'Secrets'
}

export default function PageHeader({ onOpenSearch }: { onOpenSearch: () => void }) {
  const location = useLocation()
  const parts = location.pathname.split('/').filter(Boolean)
  const breadcrumb = parts.map(part => routeLabels[part] || part)
  const title = breadcrumb[breadcrumb.length - 1] || 'Dashboard'

  return (
    <div className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{breadcrumb.join(' / ') || 'Dashboard'}</p>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        </div>
        <button
          onClick={onOpenSearch}
          className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800"
        >
          Search (⌘K)
        </button>
      </div>
    </div>
  )
}

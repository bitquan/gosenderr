import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface NavItem {
  label: string
  path: string
  icon: string
  badge?: number
}

interface NavGroup {
  title: string
  items: NavItem[]
}

export default function AdminSidebar() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const navGroups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', path: '/dashboard', icon: '🏠' }
      ]
    },
    {
      title: 'User Management',
      items: [
        { label: 'Users', path: '/users', icon: '👥' },
        { label: 'Courier Approval', path: '/courier-approval', icon: '⚡' },
        { label: 'Seller Approval', path: '/seller-approval', icon: '🏪' }
      ]
    },
    {
      title: 'Communications',
      items: [
        { label: 'Messaging', path: '/messaging', icon: '💬' },
        { label: 'Disputes', path: '/disputes', icon: '⚖️' }
      ]
    },
    {
      title: 'Operations',
      items: [
        { label: 'Jobs', path: '/jobs', icon: '📦' },
        { label: 'Courier Rates', path: '/rate-cards-comparison', icon: '💲' }
      ]
    },
    {
      title: 'Marketplace',
      items: [
        { label: 'Items', path: '/marketplace', icon: '🛍️' },
        { label: 'Flagged Content', path: '/flagged-content', icon: '🚩' },
        { label: 'Orders', path: '/marketplace-orders', icon: '📦' },
        { label: 'Categories', path: '/categories', icon: '📁' }
      ]
    },
    {
      title: 'Finance',
      items: [
        { label: 'Revenue', path: '/revenue', icon: '💰' }
      ]
    },
    {
      title: 'System',
      items: [
        { label: 'System Check', path: '/system-check', icon: '🔧' },
        { label: 'Audit Logs', path: '/audit-logs', icon: '📋' },
        { label: 'Feature Flags', path: '/feature-flags', icon: '🎚️' },
        { label: 'Secrets', path: '/settings/secrets', icon: '🔑' },
        { label: 'Admin Flow Logs', path: '/admin-flow-logs', icon: '🧪' },
        { label: 'Settings', path: '/settings', icon: '⚙️' }
      ]
    }
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-300 ease-in-out flex flex-col ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="text-3xl">🚀</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">GoSenderr</h1>
              <p className="text-xs text-gray-500">Admin Portal</p>
            </div>
          </Link>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-br from-purple-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
              {user?.email?.[0].toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Admin</p>
              <p className="text-xs text-gray-600 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="p-4 space-y-6 flex-1 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3">
                {group.title}
              </h3>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="flex-1 font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="px-2 py-0.5 text-xs font-bold bg-red-500 text-white rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full mb-3 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 text-sm font-medium"
          >
            Sign Out
          </button>
          <div className="text-xs text-gray-500 text-center">
            <p>GoSenderr Admin v1.0</p>
            <p className="mt-1">© 2026</p>
          </div>
        </div>
      </aside>
    </>
  )
}

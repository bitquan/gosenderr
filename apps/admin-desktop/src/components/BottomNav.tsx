import { Link, useLocation } from 'react-router-dom'

export default function BottomNav() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-xl z-50">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-around">
          <Link
            to="/dashboard"
            className={`flex flex-col items-center py-3 px-4 transition-colors ${
              isActive('/dashboard')
                ? 'text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-2xl mb-1">🏠</span>
            <span className="text-xs font-medium">Dashboard</span>
          </Link>

          <Link
            to="/users"
            className={`flex flex-col items-center py-3 px-4 transition-colors ${
              isActive('/users')
                ? 'text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-2xl mb-1">👥</span>
            <span className="text-xs font-medium">Users</span>
          </Link>

          <Link
            to="/jobs"
            className={`flex flex-col items-center py-3 px-4 transition-colors ${
              isActive('/jobs')
                ? 'text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-2xl mb-1">📦</span>
            <span className="text-xs font-medium">Jobs</span>
          </Link>

          <Link
            to="/settings"
            className={`flex flex-col items-center py-3 px-4 transition-colors ${
              isActive('/settings')
                ? 'text-purple-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="text-2xl mb-1">⚙️</span>
            <span className="text-xs font-medium">Settings</span>
          </Link>
        </div>
      </div>
    </nav>
  )
}

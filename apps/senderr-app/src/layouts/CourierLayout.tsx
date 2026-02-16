import { Link, Outlet, useLocation } from 'react-router-dom'
import { BottomNav, courierNavItems } from '../components/BottomNav'
import { debugLogger } from '../utils/debugLogger'
import { useEffect } from 'react'
import { useCourierLocationWriter } from '../hooks/v2/useCourierLocationWriter'

export default function CourierLayout() {
  debugLogger.log('render', 'CourierLayout render start')
  const location = useLocation()

  useCourierLocationWriter()

  useEffect(() => {
    debugLogger.log('render', 'CourierLayout mounted with Outlet')
  }, [])
  
  return (
    <>
      <main className="app-shell">
        <div className="hidden lg:block sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center gap-2">
            {courierNavItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                location.pathname.startsWith(item.href + '/')

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </div>
        </div>
        <Outlet />
      </main>
      <div className="lg:hidden">
        <BottomNav items={courierNavItems} />
      </div>
    </>
  )
}

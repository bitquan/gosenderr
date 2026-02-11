import { ReactNode, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BottomNav, NavItem } from '../BottomNav'
import { useAuth } from '../../hooks/useAuth'
import { useRole } from '../../hooks/useRole'
import { Header } from './Header'
import { Footer } from './Footer'

const CORE_NAV: Array<NavItem & { description?: string }> = [
  { label: 'Browse', href: '/marketplace', icon: '🏠', description: 'Explore listings' },
  { label: 'Sell', href: '/marketplace/sell', icon: '🏪', description: 'Create a listing' },
  { label: 'Messages', href: '/messages', icon: '💬', description: 'Chat with buyers' },
  { label: 'Profile', href: '/profile', icon: '👤', description: 'Account settings' },
]

const DELIVERY_NAV: Array<NavItem & { description?: string }> = [
  { label: 'Package Delivery', href: '/jobs', icon: '📦', description: 'Schedule a send' },
  { label: 'Pickup Food', href: '/food-pickups', icon: '🍱', description: 'Browse food pickup spots' },
  { label: 'Ship', href: '/ship', icon: '🚚', description: 'Custom courier jobs' },
]

const DASHBOARD_LINKS: Array<NavItem & { description?: string }> = [
  { label: 'Customer Dashboard', href: '/dashboard', icon: '📊' },
  { label: 'Seller Dashboard', href: '/seller/dashboard', icon: '🏬' },
]

const sections = (isCustomer: boolean, isSeller: boolean) => [
  { title: 'Core', items: CORE_NAV, visible: true },
  { title: 'Delivery', items: DELIVERY_NAV, visible: isCustomer },
  { title: 'Dashboards', items: DASHBOARD_LINKS, visible: isCustomer || isSeller },
]

const QUICK_NAV_ACTIONS = [...CORE_NAV, ...DELIVERY_NAV, ...DASHBOARD_LINKS]

interface Props {
  children: ReactNode
  floatingControls?: ReactNode
}

export function SenderrplaceShell({ children, floatingControls }: Props) {
  const location = useLocation()
  const { user } = useAuth()
  const { isCustomer, isSeller } = useRole()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/marketplace') {
      return location.pathname === '/' || location.pathname.startsWith('/marketplace')
    }
    return location.pathname.startsWith(href)
  }

  const visibleSections = sections(isCustomer, isSeller)

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-blue-950 via-purple-900 to-purple-950 text-gray-900">
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 rounded-full border border-white/30 bg-blue-900/80 text-white px-3 py-2 text-sm font-semibold shadow"
      >
        Menu
      </button>

      <div className="hidden lg:flex relative">
        {!sidebarOpen && (
          <div
            className="absolute left-0 top-16 z-40 flex w-16 flex-col items-center gap-3 rounded-br-[36px] border border-white/20 bg-gradient-to-b from-blue-950/80 via-purple-950/80 to-purple-900/80 p-2 text-white/80 shadow-2xl backdrop-blur h-auto"
          >
            {QUICK_NAV_ACTIONS.map((navItem) => (
              <Link
                key={navItem.href}
                to={navItem.href}
                className="text-2xl rounded-md text-white/70 hover:text-white"
                aria-label={navItem.label}
              >
                {navItem.icon}
              </Link>
            ))}
            <button
              onClick={() => setSidebarOpen(true)}
              className="mt-2 w-full rounded-full bg-white/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-widest text-white/70 hover:bg-white/20 transition"
              aria-label="Open navigation"
            >
              Open
            </button>
          </div>
        )}
        <aside
          className={`relative flex flex-col border-r border-white/10 bg-slate-950/90 shadow-2xl transition-all duration-300 ease-in-out ${
            sidebarOpen ? 'w-64 opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-full'
          }`}
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold text-white">Quick Nav</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-sm text-white/70 hover:text-white"
                aria-label="Collapse sidebar"
              >
                ◀
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_NAV_ACTIONS.map((action) => (
                <Link
                  key={action.href}
                  to={action.href}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xl text-white/80 hover:border-white/40 hover:text-white transition"
                  aria-label={action.label}
                >
                  {action.icon}
                </Link>
              ))}
            </div>
          </div>
          <div className="px-6 py-4 border-b border-white/10 text-white/60">
            <div className="text-xs uppercase tracking-widest">Senderrplace</div>
            <div className="text-[10px] text-white/40">by GoSenderr</div>
          </div>
          <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
            {visibleSections.map(
              (section) =>
                section.visible && (
                  <div key={section.title} className="space-y-2">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                      {section.title}
                    </div>
                    <div className="space-y-2">
                      {section.items.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={`group flex items-center gap-3 rounded-xl px-3 py-2 transition ${
                            isActive(item.href)
                              ? 'bg-white/10 text-white font-semibold shadow-inner'
                              : 'text-white/70 hover:bg-white/5'
                          }`}
                        >
                          <span className="text-lg">{item.icon}</span>
                          <div>
                            <div className="text-sm">{item.label}</div>
                            {item.description && (
                              <div className="text-[11px] text-white/50">{item.description}</div>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
            )}
          </nav>
          {user && (
            <div className="px-4 py-5 border-t border-white/20 space-y-2 text-white/80">
              <div className="text-xs">Signed in as</div>
              <div className="text-sm font-semibold truncate">{user.email}</div>
            </div>
          )}
        </aside>
      </div>
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-blue-700/70 via-purple-800/50 to-transparent blur-3xl opacity-90 pointer-events-none" />
          <div className="relative flex-1 overflow-y-auto">
            <div className="flex-1 min-h-[calc(100vh-5rem)] px-4 pb-32 pt-6 sm:px-6 lg:px-10">
              {children}
            </div>
          </div>
        </main>
        <Footer />
        <div className="md:hidden">
          <BottomNav items={CORE_NAV} />
        </div>
      </div>

      {floatingControls}

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          ></div>
          <div className="relative z-50 w-64 bg-gradient-to-b from-blue-900 via-purple-950 to-purple-900 border-r border-white/20 shadow-xl p-4 space-y-4 text-white">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">Menu</div>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-sm font-semibold text-white/80"
              >
                Close
              </button>
            </div>
            {visibleSections.map(
              (section) =>
                section.visible && (
                  <div key={section.title} className="space-y-2">
                    <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">
                      {section.title}
                    </div>
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <Link
                          key={item.href}
                          to={item.href}
                          onClick={() => setMobileOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10"
                        >
                          <span>{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                )
            )}
          </div>
        </div>
      )}
    </div>
  )
}

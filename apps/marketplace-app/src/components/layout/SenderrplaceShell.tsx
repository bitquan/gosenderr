import { ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useRole } from '../../hooks/useRole'
import { Header } from './Header'
import { Footer } from './Footer'
import { getMarketplaceSidebarSections } from '../../lib/navigation/shellNav'
const SIDEBAR_PREF_KEY = 'senderrplace.sidebar.expanded'
const MIN_TABLET_WIDTH = 768
const MIN_DESKTOP_WIDTH = 1024

interface Props {
  children: ReactNode
  floatingControls?: ReactNode
}

export function SenderrplaceShell({ children, floatingControls }: Props) {
  const location = useLocation()
  const { user } = useAuth()
  const { isCustomer, isSeller, isAdmin } = useRole()
  const [viewportWidth, setViewportWidth] = useState(() => {
    if (typeof window === 'undefined') return MIN_DESKTOP_WIDTH
    return window.innerWidth
  })
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = window.localStorage.getItem(SIDEBAR_PREF_KEY)
    if (saved === '1') return true
    if (saved === '0') return false
    return true
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(SIDEBAR_PREF_KEY, sidebarExpanded ? '1' : '0')
  }, [sidebarExpanded])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const isPhone = viewportWidth < MIN_TABLET_WIDTH
  const isTablet = viewportWidth >= MIN_TABLET_WIDTH && viewportWidth < MIN_DESKTOP_WIDTH
  const isDesktop = viewportWidth >= MIN_DESKTOP_WIDTH

  const effectiveSidebarExpanded = isDesktop && sidebarExpanded
  const sidebarWidthClass = effectiveSidebarExpanded
    ? 'w-72'
    : isPhone
      ? 'w-16'
      : isTablet
        ? 'w-20'
        : 'w-20'
  const showLabels = effectiveSidebarExpanded
  const showSectionTitles = effectiveSidebarExpanded

  const isActive = (href: string) => {
    if (href === '/marketplace') {
      return location.pathname === '/' || location.pathname.startsWith('/marketplace')
    }
    return location.pathname.startsWith(href)
  }

  const visibleSections = useMemo(
    () => getMarketplaceSidebarSections(isCustomer, isSeller, isAdmin),
    [isCustomer, isSeller, isAdmin]
  )

  return (
    <div className="min-h-screen grid grid-cols-[auto,1fr] bg-gradient-to-br from-blue-950 via-purple-900 to-purple-950 text-gray-900">
      <aside
        className={`sticky top-0 h-screen ${sidebarWidthClass} border-r border-white/15 bg-slate-950/90 shadow-2xl transition-all duration-300 ease-in-out backdrop-blur`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-white/10 px-3 py-3">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📦</div>
              {showLabels && (
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">Senderrplace</div>
                  <div className="truncate text-[10px] uppercase tracking-[0.24em] text-white/45">
                    by GoSenderr
                  </div>
                </div>
              )}
            </div>
            {isDesktop && (
              <button
                onClick={() => setSidebarExpanded((prev) => !prev)}
                className="mt-3 w-full rounded-lg border border-white/20 bg-white/5 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 hover:bg-white/10"
                aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
              >
                {sidebarExpanded ? 'Collapse' : 'Expand'}
              </button>
            )}
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
            {visibleSections.map((section) => (
              <div key={section.title} className="space-y-1.5">
                {showSectionTitles && (
                  <div className="px-2 text-[10px] uppercase tracking-[0.3em] text-white/45">
                    {section.title}
                  </div>
                )}
                <div className="space-y-1.5">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      className={`group flex items-center ${showLabels ? 'gap-3 px-3 py-2.5 rounded-xl' : 'justify-center px-2 py-2 rounded-lg'} transition ${
                        isActive(item.href)
                          ? 'bg-white/14 text-white font-semibold shadow-inner'
                          : 'text-white/75 hover:bg-white/8'
                      }`}
                      aria-label={item.label}
                    >
                      <span className="text-xl leading-none">{item.icon}</span>
                      {showLabels && (
                        <div className="min-w-0">
                          <div className="truncate text-sm">{item.label}</div>
                          {item.description && (
                            <div className="truncate text-[11px] text-white/55">
                              {item.description}
                            </div>
                          )}
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {user && showLabels && (
            <div className="border-t border-white/15 px-3 py-4 text-white/80">
              <div className="text-xs">Signed in as</div>
              <div className="truncate text-sm font-semibold">{user.email}</div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <Header />
        <main className="flex-1 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-blue-700/70 via-purple-800/50 to-transparent blur-3xl opacity-90 pointer-events-none" />
          <div className="relative flex-1 overflow-y-auto">
            <div className="flex-1 min-h-[calc(100vh-5rem)] px-4 pb-28 pt-4 sm:px-5 md:px-6 lg:px-10">
              {children}
            </div>
          </div>
        </main>
        <Footer />
      </div>

      {floatingControls}
    </div>
  )
}

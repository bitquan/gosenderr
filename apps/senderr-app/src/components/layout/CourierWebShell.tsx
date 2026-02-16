import { ReactNode, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  COURIER_SHELL_ITEMS,
  COURIER_SHELL_SECTIONS,
  resolveCourierShellTitle,
} from '@/lib/navigation/shellNav'

interface CourierWebShellProps {
  children: ReactNode
}

export function CourierWebShell({ children }: CourierWebShellProps) {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const [expanded, setExpanded] = useState(true)
  const currentPath = location.pathname

  const title = useMemo(() => resolveCourierShellTitle(currentPath), [currentPath])

  const shellWidth = expanded ? 'w-72' : 'w-20'
  const isActive = (href: string) => currentPath === href || currentPath.startsWith(`${href}/`)

  return (
    <div className="relative min-h-screen bg-[#080f2b] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 -right-28 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute top-56 -left-20 h-80 w-80 rounded-full bg-indigo-500/25 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-purple-500/20 blur-3xl" />
      </div>

      <div className="relative lg:grid lg:min-h-screen lg:grid-cols-[auto,1fr]">
        <aside
          className={`hidden ${shellWidth} lg:flex lg:flex-col border-r border-white/10 bg-slate-950/85 backdrop-blur-xl transition-all duration-300`}
        >
          <div className="border-b border-white/10 px-3 py-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🚚</div>
              {expanded ? (
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-white">Senderr Courier</div>
                  <div className="truncate text-[10px] uppercase tracking-[0.26em] text-cyan-200/60">Web Mission Control</div>
                </div>
              ) : null}
            </div>
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-3 w-full rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70 hover:bg-white/10"
              aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
            {COURIER_SHELL_SECTIONS.map((section) => (
              <div key={section.title} className="space-y-1.5">
                {expanded ? (
                  <div className="px-2 text-[10px] uppercase tracking-[0.3em] text-white/45">{section.title}</div>
                ) : null}
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    aria-label={item.label}
                    className={`group flex items-center ${
                      expanded ? 'gap-3 px-3 py-2.5 rounded-xl' : 'justify-center px-2 py-2 rounded-lg'
                    } transition ${
                      isActive(item.href)
                        ? 'bg-gradient-to-r from-blue-500/35 via-indigo-500/25 to-purple-500/35 text-white shadow-inner border border-white/20'
                        : 'text-white/75 hover:bg-white/8 border border-transparent'
                    }`}
                  >
                    <span className="text-xl leading-none">{item.icon}</span>
                    {expanded ? (
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{item.label}</div>
                        {item.description ? (
                          <div className="truncate text-[11px] text-white/55">{item.description}</div>
                        ) : null}
                      </div>
                    ) : null}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          {expanded ? (
            <div className="border-t border-white/10 px-3 py-4">
              <div className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.2em] text-cyan-100/70">Signed in</div>
                <div className="truncate text-sm font-semibold text-cyan-50">{user?.email ?? 'unknown'}</div>
              </div>
            </div>
          ) : null}
        </aside>

        <div className="min-w-0 lg:min-h-screen lg:flex lg:flex-col">
          <header className="sticky top-0 z-50 border-b border-cyan-200/20 bg-gradient-to-r from-[#0f2a6d] via-[#163a8f] to-[#2245a6] shadow-lg backdrop-blur">
            <div className="mx-auto flex h-16 w-full max-w-[1480px] items-center justify-between gap-3 px-4 sm:px-6">
              <div>
                <h1 className="text-base font-bold tracking-tight sm:text-lg">{title}</h1>
                <p className="text-xs text-blue-100/80">Senderr web app • courier-first workspace</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/jobs"
                  className="hidden rounded-lg border border-white/20 bg-blue-900/35 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900/50 sm:inline-flex"
                >
                  Jobs
                </Link>
                <Link
                  to="/routes"
                  className="hidden rounded-lg border border-white/20 bg-blue-900/35 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900/50 sm:inline-flex"
                >
                  Routes
                </Link>
                <button
                  onClick={() => {
                    void signOut()
                  }}
                  className="rounded-lg border border-white/20 bg-blue-950/45 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-950/65"
                >
                  Sign Out
                </button>
              </div>
            </div>

            <div className="lg:hidden border-t border-white/10 px-2 py-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {COURIER_SHELL_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      isActive(item.href)
                        ? 'bg-white text-blue-700'
                        : 'bg-white/10 text-blue-100 border border-white/15'
                    }`}
                  >
                    {item.icon} {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </header>

          <main className="relative flex-1 overflow-y-auto pb-8">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-blue-500/20 via-indigo-500/20 to-transparent blur-3xl" />
            <div className="relative mx-auto w-full max-w-[1480px] px-4 pb-12 pt-4 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}

import { Link, Outlet, useLocation } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { debugLogger } from '../utils/debugLogger'
import { useEffect, useMemo } from 'react'
import { useCourierLocationWriter } from '../hooks/v2/useCourierLocationWriter'
import { useAuthUser } from '../hooks/v2/useAuthUser'
import { useOpenJobs } from '../hooks/v2/useOpenJobs'
import { useUserDoc } from '../hooks/v2/useUserDoc'
import { courierShellNavItems } from '@/lib/navigation/courierShellNav'

export default function CourierLayout() {
  debugLogger.log('render', 'CourierLayout render start')
  const location = useLocation()
  const { uid } = useAuthUser()
  const { jobs } = useOpenJobs()
  const { userDoc } = useUserDoc()

  useCourierLocationWriter()

  const activeJob = useMemo(() => {
    return jobs.find(
      (job) =>
        job.courierUid === uid &&
        !['completed', 'cancelled'].includes(job.status),
    )
  }, [jobs, uid])

  const walletBalanceRaw =
    (userDoc as any)?.courierProfile?.tokenWallet?.balance ??
    (userDoc as any)?.tokenWallet?.balance ??
    (userDoc as any)?.wallet?.tokenBalance ??
    null
  const walletBalance = walletBalanceRaw == null ? null : Number(walletBalanceRaw)
  const showWallet = (userDoc as any)?.courierProfile?.showTokenWallet !== false

  useEffect(() => {
    debugLogger.log('render', 'CourierLayout mounted with Outlet')
  }, [])
  
  return (
    <>
      <main className="app-shell bg-gradient-to-br from-blue-950 via-purple-900 to-purple-950">
        <div className="hidden lg:block sticky top-0 z-30 border-b border-white/15 bg-slate-950/90 backdrop-blur">
          <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="text-xl">🚚</div>
              <p className="text-sm font-semibold text-white">Senderr Courier</p>
            </div>
            <div className="flex items-center gap-2">
            {courierShellNavItems.map((item) => {
              const isActive =
                location.pathname === item.href ||
                location.pathname.startsWith(item.href + '/')

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'text-white/75 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
            </div>
            <div className="flex items-center gap-2">
              <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90">
                {showWallet
                  ? `Wallet ${walletBalance == null ? '—' : walletBalance.toLocaleString()}`
                  : 'Wallet hidden'}
              </div>
              <Link
                to={activeJob ? `/jobs/${activeJob.id}` : '/jobs'}
                className="rounded-full bg-gradient-to-r from-[#6B4EFF] to-[#9D7FFF] px-4 py-2 text-xs font-semibold text-white"
              >
                {activeJob ? 'Resume active delivery' : 'Open jobs'}
              </Link>
            </div>
          </div>
        </div>
        <div className="pb-[calc(var(--bottom-nav-height,120px)+1rem)] lg:pb-0">
          <Outlet />
        </div>
      </main>
      <div className="lg:hidden">
        <BottomNav
          items={courierShellNavItems}
          activeJobHref={activeJob ? `/jobs/${activeJob.id}` : null}
          walletBalance={walletBalance}
          showWallet={showWallet}
        />
      </div>
    </>
  )
}

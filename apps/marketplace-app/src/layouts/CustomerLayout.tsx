import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { Overlay } from '../components/ui/Overlay'
import { useAuthUser } from '../hooks/v2/useAuthUser'
import { useCustomerJobs } from '../hooks/v2/useCustomerJobs'
import { SenderrplaceShell } from '../components/layout/SenderrplaceShell'

export default function CustomerLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { uid } = useAuthUser()
  const { jobs, loading: jobsLoading } = useCustomerJobs(uid || null)
  const [showSendModal, setShowSendModal] = useState(false)
  const isSendActive = location.pathname.startsWith('/jobs/new') || location.pathname.startsWith('/request-delivery')
  const isHome = location.pathname === '/' || location.pathname.startsWith('/marketplace')

  useEffect(() => {
    if (showSendModal && isSendActive) {
      setShowSendModal(false)
    }
  }, [showSendModal, isSendActive])

  const activeJob = useMemo(() => {
    if (jobsLoading || !jobs.length) return null
    const activeStatuses = new Set([
      'open',
      'assigned',
      'enroute_pickup',
      'arrived_pickup',
      'picked_up',
      'enroute_dropoff',
      'arrived_dropoff',
    ])
    return jobs.find((job) => activeStatuses.has(job.status)) || null
  }, [jobs, jobsLoading])

  const handleSendClick = () => {
    if (!uid) {
      navigate('/login')
      return
    }
    setShowSendModal(true)
  }

  const floatingControls = (
    <>
      <button
        onClick={handleSendClick}
        aria-label="Create a new send"
        className={`fixed bottom-16 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-3 shadow-xl transition-all active:scale-95 md:bottom-20 md:right-6 md:px-5 backdrop-blur border ${
          isSendActive
            ? 'bg-blue-700/90 text-white border-blue-300/70'
            : 'bg-blue-800/75 text-white border-blue-300/60 hover:bg-blue-700/90'
        }`}
      >
        <span className="text-lg">🚚</span>
        <span className="text-sm font-semibold">Send</span>
      </button>
      {uid && activeJob && isHome && (
        <button
          onClick={() => navigate(`/jobs/${activeJob.id}`)}
          aria-label="View send status"
          className="fixed bottom-28 right-4 z-50 flex items-center gap-2 rounded-full px-4 py-3 shadow-xl transition-all active:scale-95 md:bottom-32 md:right-6 md:px-5 backdrop-blur border bg-purple-700/80 text-white border-purple-300/60 hover:bg-purple-600/85"
        >
          <span className="text-lg">🧭</span>
          <span className="text-sm font-semibold">Status</span>
        </button>
      )}
    </>
  )

  return (
    <SenderrplaceShell floatingControls={floatingControls}>
      <Outlet />
      <Overlay
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        variant="sheet"
        panelClassName="shadow-2xl"
      >
        <div className="rounded-3xl border border-white/20 bg-gradient-to-br from-blue-900/95 to-purple-900/95 p-4 text-white">
          <div className="flex justify-end">
            <button
              onClick={() => setShowSendModal(false)}
              className="h-10 w-10 rounded-full border border-white/35 bg-white/10 text-xl text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className="space-y-5 px-4 pb-3 pt-1">
            <div>
              <h2 className="text-4xl font-bold leading-tight sm:text-5xl">What are you sending?</h2>
              <p className="mt-2 text-lg text-white/85">Pick one to open the right form.</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowSendModal(false)
                  navigate('/jobs/new')
                }}
                className="w-full rounded-2xl border border-white/35 bg-white/10 px-5 py-4 text-left text-xl font-semibold text-white transition hover:bg-white/20"
              >
                📦 Send Packages
              </button>
              <button
                onClick={() => {
                  setShowSendModal(false)
                  navigate('/food-pickups')
                }}
                className="w-full rounded-2xl border border-white/35 bg-white/10 px-5 py-4 text-left text-xl font-semibold text-white transition hover:bg-white/20"
              >
                🍱 Food Pickup
              </button>
            </div>
          </div>
        </div>
      </Overlay>
    </SenderrplaceShell>
  )
}

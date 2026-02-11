import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { CustomerJobCreateForm } from '../features/jobs/customer/CustomerJobCreateForm'
import { Overlay } from '../components/ui/Overlay'
import { useAuthUser } from '../hooks/v2/useAuthUser'
import { useCustomerJobs } from '../hooks/v2/useCustomerJobs'
import { SenderrplaceShell } from '../components/layout/SenderrplaceShell'

export default function CustomerLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { uid, user } = useAuthUser()
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
        className={`fixed bottom-16 right-5 z-50 flex items-center gap-2 rounded-full px-5 py-3 shadow-xl transition-all active:scale-95 md:bottom-20 md:right-8 backdrop-blur border ${
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
          className="fixed bottom-28 left-5 z-50 flex items-center gap-2 rounded-full px-5 py-3 shadow-xl transition-all active:scale-95 md:bottom-32 md:left-8 backdrop-blur border bg-purple-700/80 text-white border-purple-300/60 hover:bg-purple-600/85"
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
        panelClassName="shadow-2xl bg-gradient-to-b from-blue-950 via-purple-900 to-purple-950 border border-white/15"
      >
        <div className="flex justify-end px-3 pt-3 pb-1">
          <button
            onClick={() => setShowSendModal(false)}
            className="w-10 h-10 rounded-full bg-white/20 text-white border border-white/30"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-4 pb-4">
          {uid ? <CustomerJobCreateForm uid={uid} contributorName={user?.displayName || user?.email || "Customer"} /> : null}
        </div>
      </Overlay>
    </SenderrplaceShell>
  )
}

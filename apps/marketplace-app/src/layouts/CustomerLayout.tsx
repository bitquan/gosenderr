import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav, marketplaceNavItems } from '../components/BottomNav'
import { Header } from '../components/layout/Header'
import { Footer } from '../components/layout/Footer'
import { useMemo, useState } from 'react'
import { useAuthUser } from '../hooks/v2/useAuthUser'
import { useCustomerJobs } from '../hooks/v2/useCustomerJobs'
import { CustomerJobCreateForm } from '../features/jobs/customer/CustomerJobCreateForm'
import { Overlay } from '../components/ui/Overlay'

export default function CustomerLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { uid } = useAuthUser()
  const { jobs, loading: jobsLoading } = useCustomerJobs(uid || null)
  const [showSendModal, setShowSendModal] = useState(false)
  const isSendActive = location.pathname.startsWith('/jobs/new') || location.pathname.startsWith('/request-delivery')
  const isHome = location.pathname === '/' || location.pathname.startsWith('/marketplace')

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

  return (
    <div className="min-h-screen bg-[#F8F9FF] flex flex-col">
      <Header />
      <div className="flex-1 pb-24">
        <Outlet />
      </div>
      <Footer />
      <button
        onClick={handleSendClick}
        aria-label="Create a new send"
        className={`fixed bottom-28 right-5 z-50 flex items-center gap-2 rounded-full px-5 py-3 shadow-xl transition-all active:scale-95 md:bottom-32 md:right-8 backdrop-blur border ${
          isSendActive
            ? 'bg-white/90 text-green-700 border-white/70'
            : 'bg-white/70 text-green-700 border-white/60 hover:bg-white/90'
        }`}
      >
        <span className="text-lg">🚚</span>
        <span className="text-sm font-semibold">Send</span>
      </button>
      {uid && activeJob && isHome && (
        <button
          onClick={() => navigate(`/jobs/${activeJob.id}`)}
          aria-label="View send status"
          className="fixed bottom-28 left-5 z-50 flex items-center gap-2 rounded-full px-5 py-3 shadow-xl transition-all active:scale-95 md:bottom-32 md:left-8 backdrop-blur border bg-white/80 text-purple-700 border-white/60 hover:bg-white"
        >
          <span className="text-lg">🧭</span>
          <span className="text-sm font-semibold">Status</span>
        </button>
      )}
      <BottomNav items={marketplaceNavItems} />

      <Overlay
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        variant="sheet"
        panelClassName="shadow-2xl"
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create New Delivery</h2>
          <button
            onClick={() => setShowSendModal(false)}
            className="w-9 h-9 rounded-full bg-gray-100 text-gray-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="p-4">
          {uid ? <CustomerJobCreateForm uid={uid} /> : null}
        </div>
      </Overlay>
    </div>
  )
}

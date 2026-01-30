import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { MapboxMap, MapboxMapHandle } from '@/components/v2/MapboxMap'
import AvailableJobCard from './AvailableJobCard'
import ActiveJobCard from './ActiveJobCard'
import NavigationCard from './NavigationCard'
import StatusBanner from './StatusBanner'
import { Job } from '@/lib/v2/types'
import { calcMiles, calcFee } from '@/lib/v2/pricing'
import { useMapboxDirections } from '@/hooks/useMapboxDirections'
import { useCourierLocationWriter } from '@/hooks/v2/useCourierLocationWriter'
import { updateJobStatus } from '@/lib/v2/jobs'
import { useClaimJob } from '@/hooks/v2/useClaimJob'
import { useAuthUser } from '@/hooks/v2/useAuthUser'
import { JobThumbnail } from '@/components/navigation/JobThumbnail'
import { useNavigation } from '@/hooks/useNavigation'

interface Props {
  jobs: Job[]
  userDoc: any
  onAcceptJob: (jobId: string, fee: number) => Promise<void>
  claiming: boolean
  // Optional external start signal (e.g., dashboard Start Trip button)
  externalStartJobId?: string | null
  onStartTriggered?: (jobId: string) => void
  // If the parent page has an expanded detail sheet open, it can pass that state here
  // so MapShell hides its compact active card to avoid duplicate UI surfaces.
  detailOpen?: boolean
  // Called when inner compact card requests to open the parent detail sheet
  onRequestView?: (jobId: string) => void
}

export default function MapShell({ jobs, userDoc, onAcceptJob, claiming, externalStartJobId, onStartTriggered, detailOpen, onRequestView }: Props) {
  const mapRef = useRef<MapboxMapHandle | null>(null)
  const { route, routeSegments, fetchJobRoute, fetchRoute, loading: routeLoading, clearRoute } = useMapboxDirections()
  const { isTracking } = useCourierLocationWriter()
  const { uid } = useAuthUser()
  const { claim } = useClaimJob()
  const { startNavigation, isNavigating } = useNavigation()
  const navigate = useNavigate()
  const location = useLocation()

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [hasSavedNavigation, setHasSavedNavigation] = useState(false)

  useEffect(() => {
    try {
      const saved = !!localStorage.getItem('navigation_state')
      console.log('🔍 Checking saved navigation state:', saved)
      setHasSavedNavigation(saved)
    } catch (err) {
      console.warn('Could not check navigation state:', err)
      setHasSavedNavigation(false)
    }
  }, [isNavigating])
  const [mode, setMode] = useState<'idle' | 'preview' | 'assigned' | 'navigation'>('idle')
  const [navState, setNavState] = useState<'toPickup' | 'toDropoff' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Persist actionLoading to prevent race conditions
  const actionLoadingRef = useRef(false)
  useEffect(() => {
    actionLoadingRef.current = actionLoading
  }, [actionLoading])

  const openJobs = useMemo(() => jobs.filter(j => j.status === 'open' || j.courierUid === uid), [jobs, uid])

  // Auto-select first available job (or assigned by me)
  useEffect(() => {
    if (!selectedJobId && openJobs.length > 0) {
      setSelectedJobId(openJobs[0].id)
      setMode(openJobs[0].status === 'open' ? 'preview' : 'assigned')
    }
  }, [openJobs, selectedJobId])

  const selectedJob = useMemo(() => openJobs.find(j => j.id === selectedJobId) || null, [openJobs, selectedJobId])

  // Local UI animation state when opening the parent detail sheet from the compact card
  const [isAnimatingOpen, setIsAnimatingOpen] = useState(false)

  const requestOpenWithAnimation = (jobId: string) => {
    // play a short expansion animation on the compact card before asking parent to open the sheet
    setIsAnimatingOpen(true)
    // Duration should match the CSS transition (300ms)
    setTimeout(() => {
      setIsAnimatingOpen(false)
      onRequestView?.(jobId)
    }, 300)
  }

  // Map instance helper
  const map = mapRef.current?.getMap ? mapRef.current.getMap() : null

  // When a job is selected in preview mode, fetch the full job route (preview)
  useEffect(() => {
    const doPreview = async () => {
      if (!selectedJob || mode !== 'preview') return
      const courierLoc = userDoc?.courierProfile?.currentLocation
      if (!courierLoc) return

      try {
        await fetchJobRoute([courierLoc.lng, courierLoc.lat], [selectedJob.pickup.lng, selectedJob.pickup.lat], [selectedJob.dropoff.lng, selectedJob.dropoff.lat])
      } catch (err) {
        console.error('Failed to fetch preview route:', err)
      }
    }
    doPreview()
  }, [selectedJob, mode, fetchJobRoute, userDoc?.courierProfile?.currentLocation])

  // Resume navigation helper used by FAB and the ActiveJobCard
  const resumeNavigationForJob = useCallback(async (job: Job) => {
    if (!job) return

    const courierLoc = userDoc?.courierProfile?.currentLocation
    if (!courierLoc) {
      alert('Current location is unavailable. Move to a location with GPS fix and try again.');
      return
    }

    const toDropoff = ['picked_up', 'enroute_dropoff', 'arrived_dropoff', 'arrived_pickup'].includes(job.status)
    setActionLoading(true)
    try {
      console.log('🔄 Resuming navigation for job:', { jobId: job.id, status: job.status, toDropoff })
      
      if (toDropoff) {
        console.log('📍 Resuming navigation to dropoff')
        await startNavigation(job, courierLoc, { lat: job.dropoff.lat, lng: job.dropoff.lng })
        setNavState('toDropoff')
      } else {
        // When resuming before pickup, we navigate to pickup
        console.log('📍 Resuming navigation to pickup')
        await startNavigation(job, courierLoc, { lat: job.pickup.lat, lng: job.pickup.lng })
        setNavState('toPickup')
      }

      console.log('✅ Resume navigation started successfully')
      setMode('navigation')
    } catch (err) {
      console.error('❌ resumeNavigation failed:', err)
      alert('Failed to resume navigation. Please try again.')
    } finally {
      setActionLoading(false)
    }
  }, [userDoc?.courierProfile?.currentLocation, startNavigation])

  // If parent triggers an external start (e.g., dashboard Start Trip button), respond here
  useEffect(() => {
    if (!externalStartJobId) return
    // Don't start if we're already navigating for this job or an action is in progress
    if (actionLoadingRef.current) return
    if (selectedJobId === externalStartJobId && mode === 'navigation') return

    let mounted = true

    ;(async () => {
      // Find the job and make a decision: if the job is already enroute/picked, navigate directly
      const job = jobs.find(j => j.id === externalStartJobId)
      console.log('🔄 externalStart triggered for job', { jobId: externalStartJobId, jobStatus: job?.status })

      // Select the job in the UI
      setSelectedJobId(externalStartJobId)
      setMode(job?.status === 'open' ? 'preview' : 'assigned')

      try {
        if (job) {
          const inProgressStatuses = new Set(['enroute_pickup', 'arrived_pickup', 'picked_up', 'enroute_dropoff', 'arrived_dropoff'])
          if (inProgressStatuses.has(job.status)) {
            console.log('📍 Job is in progress, calling resumeNavigationForJob')
            await resumeNavigationForJob(job)
          } else {
            // Default: attempt a normal start (this will advance status to enroute_pickup)
            console.log('🆕 Job is new, calling handleStart')
            await handleStart(externalStartJobId)
          }
        } else {
          // If job not found locally, still attempt start (handleStart will warn)
          console.log('⚠️ Job not found locally, attempting handleStart anyway')
          await handleStart(externalStartJobId)
        }
      } catch (err) {
        // consume - handleStart shows alerts and we also surfaced errors here
        console.error('❌ externalStart failed:', err)
      } finally {
        // Notify parent that we attempted the start so it can clear its signal
        if (mounted) onStartTriggered?.(externalStartJobId)
      }
    })()

    return () => { mounted = false }
  }, [externalStartJobId, jobs, userDoc?.courierProfile?.currentLocation, resumeNavigationForJob])

  const feeFor = (job: Job) => {
    // Prefer server-side agreed fee when present
    if (job.agreedFee !== null && job.agreedFee !== undefined) return job.agreedFee

    const jobMiles = job.pickup && job.dropoff ? calcMiles(job.pickup, job.dropoff) : 0
    const pickupMiles = userDoc?.courierProfile?.currentLocation ? calcMiles(userDoc.courierProfile.currentLocation, job.pickup) : undefined
    const rateCard = userDoc?.courierProfile?.packageRateCard || userDoc?.courierProfile?.foodRateCard
    const transportMode = userDoc?.courierProfile?.vehicleType || 'car'
    if (!rateCard) return 0
    return calcFee(rateCard, jobMiles, pickupMiles, transportMode)
  }

  // Start trip: claim already done; advance status to enroute_pickup and fetch job route
  const handleStart = async (jobId: string) => {
    if (!uid) {
      alert('You must be signed in to start a trip')
      return
    }

    // Look up the job from the full jobs list (not just openJobs) so dashboard starts work for assigned jobs
    const job = jobs.find(j => j.id === jobId) || openJobs.find(j => j.id === jobId)

    if (!job) {
      console.warn('handleStart: job not found in jobs or openJobs', { jobId, jobsCount: jobs.length })
      alert('Job not found or not available')
      return
    }

    // If job is assigned to someone else, don't allow starting
    // If job is assigned to someone else, don't allow starting
    if (job.courierUid && job.courierUid !== uid) {
      console.warn('handleStart: job assigned to different courier', { jobId, assignedTo: job.courierUid, me: uid })
      alert('Cannot start trip — this job is assigned to a different courier')
      return
    }

    // Edge case: job is in 'assigned' status but courierUid is missing/null.
    // Try to automatically claim the job for the current user to unblock local
    // testing. This calls the same `claimJob` server API used by the accept flow
    // and will set `courierUid` atomically. If it fails, surface a clear error.
    if ((job.status === 'assigned' || job.status === 'open') && !job.courierUid) {
      console.warn('handleStart: job status is assigned but courierUid is missing — attempting auto-claim', { jobId, status: job.status, me: uid })

      if (!uid) {
        alert(`Cannot start trip — not signed in (jobId: ${jobId}).`)
        return
      }

      // Compute client fee consistent with server calc and attempt claim
      const clientFee = feeFor(job)
      try {
        const res = await claim(jobId, uid, clientFee)
        if (!res.success) {
          if (res.type === 'price-mismatch' && res.serverFee !== undefined) {
            const acceptServer = window.confirm(`Server calculated fee is $${res.serverFee.toFixed(2)} (your price: $${clientFee.toFixed(2)}). Accept server price and claim job?`)
            if (acceptServer) {
              const retry = await claim(jobId, uid, res.serverFee)
              if (!retry.success) throw new Error(retry.message || 'Failed to claim with server price')
            } else {
              alert('Claim cancelled due to price mismatch')
              return
            }
          } else {
            throw new Error(res.message || 'Failed to claim job')
          }
        }

        // Claim succeeded — fall through to start
      } catch (err: any) {
        console.error('Auto-claim failed during start:', err)
        alert(err?.message || `Failed to claim job ${jobId}.`) 
        return
      }
    }

    if (actionLoading) return

    setActionLoading(true)
    try {
      console.log('handleStart: job', job)

      // Determine navigation target based on status
      const goToDropoffStatuses = new Set(['picked_up', 'enroute_dropoff', 'arrived_dropoff'])
      const targetIsDropoff = job.status === 'arrived_pickup' || goToDropoffStatuses.has(job.status)

      // If the job is assigned and not yet enroute to pickup, advance status
      if (job.status === 'assigned' || job.status === 'open') {
        await updateJobStatus(jobId, 'enroute_pickup', uid)
      }

      // Fetch route and set navigation state depending on where we should navigate
      const courierLoc = userDoc?.courierProfile?.currentLocation
      if (!courierLoc) {
        throw new Error('Courier location unavailable')
      }

      if (targetIsDropoff) {
        // Navigate directly to dropoff (courier has already picked up or is at dropoff stage)
        console.log('handleStart: starting navigation to dropoff via Navigation hook')
        try {
          await startNavigation(job, courierLoc, { lat: job.dropoff.lat, lng: job.dropoff.lng })
          setNavState('toDropoff')
        } catch (err) {
          console.error('startNavigation failed (dropoff), falling back to fetchRoute:', err)
          await fetchRoute([courierLoc.lng, courierLoc.lat], [job.dropoff.lng, job.dropoff.lat])
          setNavState('toDropoff')
        }
      } else {
        // Navigate to pickup first (default) — use navigation hook to enter the full turn-by-turn view to pickup
        console.log('handleStart: starting navigation to pickup via Navigation hook')
        try {
          await startNavigation(job, courierLoc, { lat: job.pickup.lat, lng: job.pickup.lng })
          setNavState('toPickup')
        } catch (err) {
          console.error('startNavigation failed (pickup), falling back to fetchJobRoute:', err)
          await fetchJobRoute([courierLoc.lng, courierLoc.lat], [job.pickup.lng, job.pickup.lat], [job.dropoff.lng, job.dropoff.lat])
          setNavState('toPickup')
        }
      }

      // Mark that we're navigating; the navigation hook may navigate to the full-screen page
      setMode('navigation')
    } catch (error: any) {
      console.error('Failed to start trip:', error)
      alert(error.message || 'Failed to start trip')
    } finally {
      setActionLoading(false)
    }
  }

  const handleArrivedPickup = async () => {
    if (!selectedJob || !uid) return

    // Ensure only the assigned courier can mark arrival
    if (selectedJob.courierUid && selectedJob.courierUid !== uid) {
      alert('Cannot mark arrival — this job is assigned to a different courier.')
      return
    }

    setActionLoading(true)
    try {
      await updateJobStatus(selectedJob.id, 'arrived_pickup', uid)
    } catch (err: any) {
      console.error('Arrived pickup failed:', err)
      alert(err.message || 'Failed to mark arrived at pickup')
    } finally {
      setActionLoading(false)
    }
  }

  const handlePickedUp = async () => {
    if (!selectedJob || !uid) return

    // Ensure only the assigned courier can mark picked up
    if (selectedJob.courierUid && selectedJob.courierUid !== uid) {
      alert('Cannot mark picked up — this job is assigned to a different courier.')
      return
    }

    setActionLoading(true)
    try {
      await updateJobStatus(selectedJob.id, 'picked_up', uid)

      // use the navigation hook to start turn-by-turn to dropoff
      const courierLoc = userDoc?.courierProfile?.currentLocation
      if (!courierLoc) throw new Error('Courier location unavailable')
      console.log('handlePickedUp: starting navigation to dropoff via Navigation hook')
      try {
        await startNavigation(selectedJob, courierLoc, { lat: selectedJob.dropoff.lat, lng: selectedJob.dropoff.lng })
        setNavState('toDropoff')
        setMode('navigation')
      } catch (err) {
        console.error('startNavigation failed (picked up), falling back to fetchRoute:', err)
        await fetchRoute([courierLoc.lng, courierLoc.lat], [selectedJob.dropoff.lng, selectedJob.dropoff.lat])
        setNavState('toDropoff')
        setMode('navigation')
      }
    } catch (err: any) {
      console.error('Picked up failed:', err)
      alert(err.message || 'Failed to mark picked up')
    } finally {
      setActionLoading(false)
    }
  }

  const handleArrivedDropoff = async () => {
    if (!selectedJob || !uid) return
    setActionLoading(true)
    try {
      await updateJobStatus(selectedJob.id, 'arrived_dropoff', uid)
      // Optionally move to completed next via courier
    } catch (err: any) {
      console.error('Arrived dropoff failed:', err)
      alert(err.message || 'Failed to mark arrived at dropoff')
    } finally {
      setActionLoading(false)
    }
  }

  // Compute ETA/distance from route
  const eta = route ? `${Math.round(route.duration / 60)} min` : undefined
  const distanceMiles = route ? `${(route.distance / 1609.34).toFixed(1)} mi` : undefined

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 relative">
        <MapboxMap
          ref={mapRef}
          pickup={selectedJob?.pickup}
          dropoff={selectedJob?.dropoff}
          courierLocation={(userDoc?.courierProfile?.currentLocation as any) || null}
          routeSegments={routeSegments}
          height="100%"
        />

        {/* Job thumbnails overlay (click to select job) */}
        {map && openJobs.map((job) => (
          <JobThumbnail
            key={job.id}
            job={job}
            isSelected={selectedJobId === job.id}
            onClick={() => {
              setSelectedJobId(job.id)
              setMode('preview')
            }}
            map={map}
          />
        ))}

        {/* Floating controls on the map (recenter) */}
        <div className="absolute top-4 right-4 z-40 flex flex-col items-end gap-3">
          <button
            data-testid="recenter-btn"
            aria-label="Recenter map to courier location"
            onClick={() => {
              const courierLoc = userDoc?.courierProfile?.currentLocation
              const m = mapRef.current?.getMap()
              if (courierLoc && m) {
                m.easeTo({ center: [courierLoc.lng, courierLoc.lat], zoom: 18, duration: 600 })
              } else if (m) {
                // fallback: center to first job or current center
                const j = selectedJob || openJobs[0]
                if (j?.pickup) {
                  m.easeTo({ center: [j.pickup.lng, j.pickup.lat], zoom: 14, duration: 600 })
                }
              }
            }}
            className="bg-white shadow-md rounded-full p-3 hover:shadow-lg"
            title="Re-center map"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 8a4 4 0 100 8 4 4 0 000-8z" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5L3.5 3.5M20.5 20.5L19 19M19 5l1.5-1.5M3.5 20.5L5 19" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>

          {/* Resume navigation FAB - visible when there is saved navigation and we're not already on the active navigation page */}
          { (isNavigating || hasSavedNavigation) && location.pathname !== '/navigation/active' && (
            <button
              onClick={async () => {
                if (isNavigating) {
                  navigate('/navigation/active');
                  return;
                }

                try {
                  const raw = typeof window !== 'undefined' ? localStorage.getItem('navigation_state') : null;
                  if (!raw) {
                    alert('No saved navigation to resume');
                    return;
                  }

                  const parsed = JSON.parse(raw);
                  const jobId = parsed.jobId;
                  const job = jobs.find(j => j.id === jobId);
                  if (!job) {
                    alert('Could not find job to resume navigation');
                    return;
                  }

                  const courierLoc = userDoc?.courierProfile?.currentLocation;
                  if (!courierLoc) {
                    alert('Current location is unavailable. Move to a location with GPS fix and try again.');
                    return;
                  }

                  const dest = job.dropoff || job.pickup;
                  await startNavigation(job, courierLoc, dest);
                } catch (err) {
                  console.error('Resume navigation failed', err);
                  alert('Failed to resume navigation.');
                }
              }}
              aria-label="Resume navigation"
              title="Resume navigation"
              className="bg-emerald-600 text-white rounded-full px-4 py-3 shadow-lg hover:bg-emerald-700 transition-colors"
            >
              🧭 Resume
            </button>
          )}
        </div>
      </div>


      {/* Sheet handle: timestamp and quick view (hidden if no selected job) */}
      {selectedJob && !detailOpen && (
        <div className="bg-white border-t z-30">
          <div
            data-testid="sheet-handle"
            role="button"
            tabIndex={0}
            aria-controls="job-details-panel"
            aria-expanded={detailOpen ? 'true' : 'false'}
            aria-label={`Open details for job ${selectedJob.id}`}
            onClick={() => requestOpenWithAnimation(selectedJob.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); requestOpenWithAnimation(selectedJob.id) } }}
            className={`max-w-4xl mx-auto -mt-3 px-4 pb-3 cursor-pointer transform transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 ${isAnimatingOpen ? '-translate-y-6 scale-105 opacity-0' : 'translate-y-0 opacity-100'}`}
          >
            <div className="w-full bg-white rounded-t-xl shadow-md p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-1 bg-gray-300 rounded mr-2" />
                <div className="text-sm font-semibold">Active Send</div>
                <div className="text-xs text-gray-500 ml-2">{selectedJob.updatedAt?.toDate ? selectedJob.updatedAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : selectedJob.createdAt?.toDate ? selectedJob.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
              </div>
              <div>
                <button onClick={(e) => { e.stopPropagation(); requestOpenWithAnimation(selectedJob.id) }} aria-label="View job details" className="px-3 py-1 bg-gray-100 rounded">View</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 bg-[#F8F9FF] border-t">
        {mode === 'idle' && <div className="text-sm text-gray-500">No jobs available</div>}

        {mode === 'preview' && selectedJob && (
          <AvailableJobCard
            job={selectedJob}
            fee={feeFor(selectedJob)}
            loading={claiming}
            onAccept={async (jobId, fee) => {
              await onAcceptJob(jobId, fee)
              setMode('assigned')
            }}
          />
        )}
        {/* Only render the compact ActiveJobCard when the parent detail sheet is NOT open.
            The parent page (dashboard) may render a full-detail sheet; when that sheet is
            open we hide MapShell's compact card to avoid duplicate active surfaces. */}
        {mode === 'assigned' && selectedJob && !detailOpen && (
          <div aria-hidden={isAnimatingOpen || detailOpen} className={`transition-all duration-300 ${isAnimatingOpen ? 'transform -translate-y-6 scale-95 opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <ActiveJobCard job={selectedJob} onStart={handleStart} onView={(jobId) => requestOpenWithAnimation(jobId)} loading={actionLoading} onResume={(jobId) => {
              const job = jobs.find(j => j.id === jobId)
              if (job) resumeNavigationForJob(job)
            }} />
          </div>
        )}

        {mode === 'navigation' && selectedJob && !detailOpen && (
          // Keep the ActiveJobCard inside the bottom sheet and show navigation controls inline
          <div className={`transition-all duration-300 ${isAnimatingOpen ? 'transform -translate-y-6 scale-95 opacity-0' : 'opacity-100'}`}>
            <ActiveJobCard
              job={selectedJob}
              onStart={handleStart}
              onView={(jobId) => requestOpenWithAnimation(jobId)}
              loading={actionLoading}
              showNavControls
              onArrivedPickup={handleArrivedPickup}
              onPickedUp={handlePickedUp}
            />
          </div>
        )}

        {/* Keep a separate NavigationCard too for supplemental ETA/direction info if desired */}
        {mode === 'navigation' && (
          <NavigationCard
            eta={eta}
            distance={distanceMiles}
            // When we're already showing inline nav controls in the ActiveJobCard (mode === 'navigation'),
            // don't duplicate action buttons here. Leave this card as info-only.
            onArrivedPickup={mode === 'navigation' ? undefined : handleArrivedPickup}
            onPickedUp={mode === 'navigation' ? undefined : handlePickedUp}
          />
        )}

        <div className="mt-3">
          <StatusBanner message={`Mode: ${mode}${isTracking ? ' • Tracking' : ''}`} variant="info" />
        </div>
      </div>
    </div>
  )
}

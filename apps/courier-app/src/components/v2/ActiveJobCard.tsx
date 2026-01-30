import React from 'react'
import { Job } from '@/lib/v2/types'

interface Props {
  job: Job
  onStart: (jobId: string) => void
  onView: (jobId: string) => void
  loading?: boolean
  // Navigation controls optionally shown inside the active job card
  showNavControls?: boolean
  onArrivedPickup?: () => void
  onPickedUp?: () => void
  // Resume handler - shown when a trip is already started
  onResume?: (jobId: string) => void
}

export default function ActiveJobCard({ job, onStart, onView, loading, showNavControls, onArrivedPickup, onPickedUp, onResume }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">Active</div>
          <div className="text-base font-semibold">{job.pickup?.label || `${job.pickup.lat.toFixed(4)}, ${job.pickup.lng.toFixed(4)}`}</div>
          <div className="text-sm text-gray-600">{job.dropoff?.label || `${job.dropoff.lat.toFixed(4)}, ${job.dropoff.lng.toFixed(4)}`}</div>
        </div>
        <div className="flex flex-col gap-2">
          {/* Show Start Trip only when job can be started */}
          {(job.status === 'assigned' || job.status === 'open') ? (
            <button
              data-testid="start-trip-btn"
              aria-label={`Start trip for job ${job.id}`}
              onClick={() => onStart(job.id)}
              disabled={loading}
              className={`px-4 py-2 rounded inline-flex items-center gap-2 ${loading ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-blue-600 text-white'}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {loading ? 'Starting...' : 'Start Trip'}
            </button>
          ) : (
            // If job is already in-progress, show a Resume Navigation button
            (['enroute_pickup', 'arrived_pickup', 'picked_up', 'enroute_dropoff', 'arrived_dropoff'].includes(job.status) && onResume) ? (
              <button
                data-testid="resume-nav-btn"
                aria-label={`Resume navigation for job ${job.id}`}
                onClick={() => onResume?.(job.id)}
                className="px-4 py-2 rounded inline-flex items-center gap-2 bg-emerald-600 text-white"
              >
                🧭 Resume Nav
              </button>
            ) : (
              <div className="text-sm text-gray-500 italic">{job.status.replace(/_/g, ' ')}</div>
            )
          )}

          <button data-testid="view-job-btn" aria-label={`View details for job ${job.id}`} onClick={() => onView(job.id)} className="px-4 py-2 border rounded inline-flex items-center gap-2"> 
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12s-3-7-9-7-9 7-9 7 3 7 9 7 9-7 9-7z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            View
          </button>
        </div>
      </div>

      {/* Navigation controls embedded inside the inner card (visible when mode/navigation) */}
      {showNavControls && (
        <div className="mt-4 flex gap-3">
          <button onClick={onArrivedPickup} className="flex-1 px-3 py-2 bg-yellow-500 text-white rounded">Arrived Pickup</button>
          <button onClick={onPickedUp} className="flex-1 px-3 py-2 bg-emerald-500 text-white rounded">Picked Up</button>
        </div>
      )}
    </div>
  )
}

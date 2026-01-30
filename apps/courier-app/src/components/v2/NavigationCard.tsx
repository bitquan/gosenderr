import React from 'react'

interface Props {
  eta?: string
  distance?: string
  onArrivedPickup?: () => void
  onPickedUp?: () => void
}

export default function NavigationCard({ eta, distance, onArrivedPickup, onPickedUp }: Props) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-500">ETA</div>
          <div className="text-lg font-bold">{eta || '—'}</div>
          <div className="text-sm text-gray-500">{distance || '—'}</div>
        </div>
        <div className="flex flex-col gap-2">
          {onArrivedPickup && (
            <button onClick={onArrivedPickup} className="px-3 py-2 bg-yellow-500 text-white rounded">Arrived Pickup</button>
          )}
          {onPickedUp && (
            <button onClick={onPickedUp} className="px-3 py-2 bg-emerald-500 text-white rounded">Picked Up</button>
          )}
        </div>
      </div>
    </div>
  )
}

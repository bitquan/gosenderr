import { useState, useRef, useEffect } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { geocodeAddress } from '../lib/mapbox/geocode'

interface LocationSuggestion {
  name: string
  address: string
  lat: number
  lng: number
  placeId: string
}

interface CreateJobModalProps {
  isOpen: boolean
  onClose: () => void
  onJobCreated: () => void
}

export function CreateJobModal({ isOpen, onClose, onJobCreated }: CreateJobModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [jobType, setJobType] = useState<'package' | 'food'>('package')
  const [jobMode, setJobMode] = useState<'regular' | 'test'>('test')
  
  const [pickupQuery, setPickupQuery] = useState('')
  const [pickupSuggestions, setPickupSuggestions] = useState<LocationSuggestion[]>([])
  const [pickupSelected, setPickupSelected] = useState<LocationSuggestion | null>(null)
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
  
  const [dropoffQuery, setDropoffQuery] = useState('')
  const [dropoffSuggestions, setDropoffSuggestions] = useState<LocationSuggestion[]>([])
  const [dropoffSelected, setDropoffSelected] = useState<LocationSuggestion | null>(null)
  const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false)
  
  const [estimatedFee, setEstimatedFee] = useState('')
  const [description, setDescription] = useState('')
  
  const pickupRef = useRef<HTMLDivElement>(null)
  const dropoffRef = useRef<HTMLDivElement>(null)

  const toManualLocation = (query: string): LocationSuggestion => {
    const trimmed = query.trim()
    return {
      name: trimmed.split(',')[0] || trimmed,
      address: trimmed,
      lat: 0,
      lng: 0,
      placeId: `manual:${trimmed.toLowerCase()}`,
    }
  }

  // Search Mapbox for locations
  const searchMapbox = async (query: string): Promise<LocationSuggestion[]> => {
    try {
      if (!query.trim()) return []
      const results = (await geocodeAddress(query)) ?? []
      return results.map((feature) => ({
        name: feature.place_name.split(',')[0],
        address: feature.place_name,
        lat: feature.lat,
        lng: feature.lng,
        placeId: `${feature.lat},${feature.lng}`,
      }))
    } catch (err) {
      console.error('Mapbox search error:', err)
      return []
    }
  }

  const resolveLocation = async (query: string): Promise<LocationSuggestion | null> => {
    const trimmed = query.trim()
    if (!trimmed) return null
    const [first] = await searchMapbox(trimmed)
    return first ?? toManualLocation(trimmed)
  }

  // Handle pickup search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (pickupQuery.trim()) {
        const results = await searchMapbox(pickupQuery)
        setPickupSuggestions(results)
        setShowPickupSuggestions(true)
      } else {
        setPickupSuggestions([])
        setShowPickupSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [pickupQuery])

  // Handle dropoff search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (dropoffQuery.trim()) {
        const results = await searchMapbox(dropoffQuery)
        setDropoffSuggestions(results)
        setShowDropoffSuggestions(true)
      } else {
        setDropoffSuggestions([])
        setShowDropoffSuggestions(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [dropoffQuery])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickupRef.current && !pickupRef.current.contains(e.target as Node)) {
        setShowPickupSuggestions(false)
      }
      if (dropoffRef.current && !dropoffRef.current.contains(e.target as Node)) {
        setShowDropoffSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handlePickupSelect = (location: LocationSuggestion) => {
    setPickupSelected(location)
    setPickupQuery(location.address)
    setShowPickupSuggestions(false)
  }

  const handleDropoffSelect = (location: LocationSuggestion) => {
    setDropoffSelected(location)
    setDropoffQuery(location.address)
    setShowDropoffSuggestions(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const pickupLocation = pickupSelected ?? await resolveLocation(pickupQuery)
    const dropoffLocation = dropoffSelected ?? await resolveLocation(dropoffQuery)

    if (!pickupLocation || !dropoffLocation) {
      setError('Please select both pickup and dropoff locations')
      return
    }

    if (!estimatedFee || parseFloat(estimatedFee) <= 0) {
      setError('Fee must be greater than 0')
      return
    }

    setLoading(true)
    try {
      const jobData = {
        type: jobType,
        status: 'open',
        // Flat fields for compatibility with Jobs page
        pickupAddress: pickupLocation.address,
        deliveryAddress: dropoffLocation.address,
        // Nested fields for full location data
        pickup: {
          label: pickupLocation.name,
          address: pickupLocation.address,
          lat: pickupLocation.lat,
          lng: pickupLocation.lng,
        },
        dropoff: {
          label: dropoffLocation.name,
          address: dropoffLocation.address,
          lat: dropoffLocation.lat,
          lng: dropoffLocation.lng,
        },
        estimatedFee: parseFloat(estimatedFee),
        vehicleType: jobType === 'package' ? 'car' : 'scooter',
        description: description || '',
        createdAt: new Date(),
        testRecord: jobMode === 'test',
        createdByAdmin: true,
      }

      await addDoc(collection(db, 'jobs'), jobData)
      
      // Reset form
      setPickupQuery('')
      setPickupSelected(null)
      setDropoffQuery('')
      setDropoffSelected(null)
      setEstimatedFee('')
      setDescription('')
      setJobType('package')
      setJobMode('test')
      
      onJobCreated()
      onClose()
    } catch (err: any) {
      setError(`Failed to create job: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">+ Create Job</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-6 space-y-6">
          {/* Job Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Delivery Type
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="package"
                  checked={jobType === 'package'}
                  onChange={(e) => setJobType(e.target.value as 'package' | 'food')}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">📦 Package Delivery</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="food"
                  checked={jobType === 'food'}
                  onChange={(e) => setJobType(e.target.value as 'package' | 'food')}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">🍔 Food Delivery</span>
              </label>
            </div>
          </div>

          {/* Job Mode */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-3">
              Job Mode
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="test"
                  checked={jobMode === 'test'}
                  onChange={(e) => setJobMode(e.target.value as 'regular' | 'test')}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">🧪 Test Job</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="regular"
                  checked={jobMode === 'regular'}
                  onChange={(e) => setJobMode(e.target.value as 'regular' | 'test')}
                  className="w-4 h-4"
                />
                <span className="text-gray-700">✅ Regular Job</span>
              </label>
            </div>
          </div>

          {/* Pickup Location */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📍 Pickup Location</h3>
            <div ref={pickupRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Address
              </label>
              <input
                type="text"
                value={pickupQuery}
                onChange={(e) => {
                  const value = e.target.value
                  setPickupQuery(value)
                  if (pickupSelected && value !== pickupSelected.address) {
                    setPickupSelected(null)
                  }
                }}
                onBlur={async () => {
                  if (!pickupSelected && pickupQuery.trim()) {
                    const resolved = await resolveLocation(pickupQuery)
                    if (resolved) {
                      setPickupSelected(resolved)
                      setPickupQuery(resolved.address)
                    }
                  }
                }}
                placeholder="Search for pickup address..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              {/* Pickup Suggestions */}
              {showPickupSuggestions && pickupSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  {pickupSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.placeId}
                      type="button"
                      onClick={() => handlePickupSelect(suggestion)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{suggestion.name}</div>
                      <div className="text-sm text-gray-500">{suggestion.address}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Location Display */}
              {pickupSelected && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">{pickupSelected.name}</div>
                  <div className="text-xs text-gray-600">{pickupSelected.address}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {pickupSelected.lat.toFixed(4)}, {pickupSelected.lng.toFixed(4)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dropoff Location */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Dropoff Location</h3>
            <div ref={dropoffRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search Address
              </label>
              <input
                type="text"
                value={dropoffQuery}
                onChange={(e) => {
                  const value = e.target.value
                  setDropoffQuery(value)
                  if (dropoffSelected && value !== dropoffSelected.address) {
                    setDropoffSelected(null)
                  }
                }}
                onBlur={async () => {
                  if (!dropoffSelected && dropoffQuery.trim()) {
                    const resolved = await resolveLocation(dropoffQuery)
                    if (resolved) {
                      setDropoffSelected(resolved)
                      setDropoffQuery(resolved.address)
                    }
                  }
                }}
                placeholder="Search for dropoff address..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Dropoff Suggestions */}
              {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                  {dropoffSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.placeId}
                      type="button"
                      onClick={() => handleDropoffSelect(suggestion)}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 border-b border-gray-200 last:border-b-0"
                    >
                      <div className="font-medium text-gray-900">{suggestion.name}</div>
                      <div className="text-sm text-gray-500">{suggestion.address}</div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Location Display */}
              {dropoffSelected && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm font-medium text-gray-900">{dropoffSelected.name}</div>
                  <div className="text-xs text-gray-600">{dropoffSelected.address}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {dropoffSelected.lat.toFixed(4)}, {dropoffSelected.lng.toFixed(4)}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Estimated Fee */}
          <div className="border-t pt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Fee ($)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={estimatedFee}
              onChange={(e) => setEstimatedFee(e.target.value)}
              placeholder="20.00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fragile items, urgent delivery, etc."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

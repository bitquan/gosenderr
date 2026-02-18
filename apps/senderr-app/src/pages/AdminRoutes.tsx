import { useEffect, useState } from 'react'
import { collection, query, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { formatCurrency, formatDate } from '../lib/utils'
import { Link } from 'react-router-dom'

interface Route {
  id: string
  status: string
  runnerId?: string
  runnerEmail?: string
  totalStops?: number
  completedStops?: number
  startLocation?: string
  endLocation?: string
  estimatedDistance?: number
  estimatedDuration?: number
  paymentAmount?: number
  createdAt?: any
  claimedAt?: any
  completedAt?: any
  stops?: Array<{
    address: string
    packageId: string
    type: 'pickup' | 'delivery'
    completed: boolean
  }>
}

export default function AdminRoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'available' | 'claimed' | 'in_progress' | 'completed'>('all')

  useEffect(() => {
    loadRoutes()
  }, [])

  const loadRoutes = async () => {
    try {
      const routesQuery = query(
        collection(db, 'routes'),
        orderBy('createdAt', 'desc')
      )
      const routesSnap = await getDocs(routesQuery)
      const routesData = routesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Route[]
      setRoutes(routesData)
    } catch (error) {
      console.error('Error loading routes:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredRoutes = routes.filter(route => {
    if (filter === 'all') return true
    return route.status === filter
  })

  const getStatusBadge = (status: string) => {
    if (status === 'completed') return 'completed'
    if (status === 'in_progress' || status === 'claimed') return 'in_progress'
    return 'pending'
  }

  const getStatusColor = (status: string) => {
    if (status === 'completed') return 'bg-green-50'
    if (status === 'in_progress' || status === 'claimed') return 'bg-purple-50'
    return 'bg-blue-50'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <p className="text-gray-600">Loading routes...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
          >
            <span className="mr-2">←</span>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">🗺️ Delivery Routes</h1>
          <p className="text-purple-100">{routes.length} total routes</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 overflow-x-auto">
          {[
            { label: 'All', value: 'all' },
            { label: 'Available', value: 'available' },
            { label: 'Claimed', value: 'claimed' },
            { label: 'In Progress', value: 'in_progress' },
            { label: 'Completed', value: 'completed' }
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as any)}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all whitespace-nowrap ${
                filter === tab.value
                  ? 'bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Routes List */}
        {filteredRoutes.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">🗺️</div>
              <p className="text-gray-600 text-lg">
                No {filter !== 'all' ? filter.replace('_', ' ') : ''} routes
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredRoutes.map((route) => (
              <Card key={route.id} variant="elevated">
                <CardContent className={`p-6 ${getStatusColor(route.status)}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-mono text-gray-500">
                          Route #{route.id.slice(0, 8)}
                        </span>
                        <StatusBadge status={getStatusBadge(route.status)} />
                      </div>
                      <p className="text-xs text-gray-500 capitalize">
                        {route.status.replace('_', ' ')}
                      </p>
                    </div>
                    {route.paymentAmount && (
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(route.paymentAmount)}
                      </p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    {route.startLocation && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Start Location</p>
                        <p className="font-medium text-sm">{route.startLocation}</p>
                      </div>
                    )}

                    {route.endLocation && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">End Location</p>
                        <p className="font-medium text-sm">{route.endLocation}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="p-2 bg-white rounded-lg">
                      <p className="text-xs text-gray-500">Stops</p>
                      <p className="font-semibold">
                        {route.completedStops || 0} / {route.totalStops || 0}
                      </p>
                    </div>

                    {route.estimatedDistance && (
                      <div className="p-2 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Distance</p>
                        <p className="font-semibold">{route.estimatedDistance} mi</p>
                      </div>
                    )}

                    {route.estimatedDuration && (
                      <div className="p-2 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Duration</p>
                        <p className="font-semibold">{route.estimatedDuration} min</p>
                      </div>
                    )}

                    {route.stops && (
                      <div className="p-2 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Packages</p>
                        <p className="font-semibold">{route.stops.length}</p>
                      </div>
                    )}
                  </div>

                  {route.runnerId && (
                    <div className="p-3 bg-white border border-gray-200 rounded-lg mb-4">
                      <p className="text-xs text-gray-500 mb-1">Assigned Runner</p>
                      <p className="font-medium text-sm">
                        {route.runnerEmail || route.runnerId}
                      </p>
                      {route.claimedAt?.toDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          Claimed {formatDate(route.claimedAt.toDate())}
                        </p>
                      )}
                    </div>
                  )}

                  {route.stops && route.stops.length > 0 && (
                    <div className="p-3 bg-white rounded-lg">
                      <p className="text-xs text-gray-500 mb-2">Route Stops</p>
                      <div className="space-y-2">
                        {route.stops.slice(0, 3).map((stop, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                              stop.completed ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                            }`}>
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <p className="text-xs text-gray-900">{stop.address}</p>
                              <p className="text-xs text-gray-500 capitalize">{stop.type}</p>
                            </div>
                          </div>
                        ))}
                        {route.stops.length > 3 && (
                          <p className="text-xs text-gray-500 text-center">
                            +{route.stops.length - 3} more stops
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200 mt-3">
                    <span>
                      Created: {route.createdAt?.toDate ? formatDate(route.createdAt.toDate()) : 'Just now'}
                    </span>
                    {route.completedAt?.toDate && (
                      <span>
                        Completed: {formatDate(route.completedAt.toDate())}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

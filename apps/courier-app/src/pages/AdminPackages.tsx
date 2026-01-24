import { useEffect, useState } from 'react'
import { collection, query, getDocs, orderBy } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardContent } from '../components/Card'
import { StatusBadge } from '../components/Badge'
import { formatCurrency, formatDate } from '../lib/utils'
import { Link } from 'react-router-dom'

interface Package {
  id: string
  senderId: string
  senderEmail?: string
  recipientName?: string
  recipientPhone?: string
  recipientAddress?: string
  currentStatus: string
  weight?: number
  dimensions?: string
  serviceLevel?: string
  trackingNumber?: string
  estimatedDelivery?: any
  createdAt?: any
  cost?: number
}

export default function AdminPackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'payment_pending' | 'pickup_pending' | 'in_transit' | 'delivered'>('all')

  useEffect(() => {
    loadPackages()
  }, [])

  const loadPackages = async () => {
    try {
      const packagesQuery = query(
        collection(db, 'packages'),
        orderBy('createdAt', 'desc')
      )
      const packagesSnap = await getDocs(packagesQuery)
      const packagesData = packagesSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Package[]
      setPackages(packagesData)
    } catch (error) {
      console.error('Error loading packages:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredPackages = packages.filter(pkg => {
    if (filter === 'all') return true
    return pkg.currentStatus === filter
  })

  const getStatusBadge = (status: string) => {
    if (status === 'delivered') return 'completed'
    if (status === 'in_transit') return 'in_progress'
    return 'pending'
  }

  const getStatusColor = (status: string) => {
    if (status === 'delivered') return 'bg-green-50'
    if (status === 'in_transit') return 'bg-purple-50'
    if (status === 'pickup_pending') return 'bg-blue-50'
    return 'bg-yellow-50'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FF] flex items-center justify-center">
        <p className="text-gray-600">Loading packages...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-24">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-6xl mx-auto">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
          >
            <span className="mr-2">←</span>
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold mb-2">📦 Package Shipments</h1>
          <p className="text-purple-100">{packages.length} total packages</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 overflow-x-auto">
          {[
            { label: 'All', value: 'all' },
            { label: 'Payment Pending', value: 'payment_pending' },
            { label: 'Pickup Pending', value: 'pickup_pending' },
            { label: 'In Transit', value: 'in_transit' },
            { label: 'Delivered', value: 'delivered' }
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

        {/* Packages List */}
        {filteredPackages.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-600 text-lg">
                No {filter !== 'all' ? filter.replace('_', ' ') : ''} packages
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredPackages.map((pkg) => (
              <Card key={pkg.id} variant="elevated">
                <CardContent className={`p-6 ${getStatusColor(pkg.currentStatus)}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-mono text-gray-500">
                          #{pkg.trackingNumber || pkg.id.slice(0, 8)}
                        </span>
                        <StatusBadge status={getStatusBadge(pkg.currentStatus)} />
                      </div>
                      <p className="text-xs text-gray-500 capitalize">
                        {pkg.currentStatus.replace('_', ' ')}
                      </p>
                    </div>
                    {pkg.cost && (
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(pkg.cost)}
                      </p>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Sender</p>
                      <p className="font-medium">{pkg.senderEmail || pkg.senderId}</p>
                    </div>

                    {pkg.recipientName && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Recipient</p>
                        <p className="font-medium">{pkg.recipientName}</p>
                        {pkg.recipientPhone && (
                          <p className="text-xs text-gray-600">{pkg.recipientPhone}</p>
                        )}
                      </div>
                    )}

                    {pkg.recipientAddress && (
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Delivery Address</p>
                        <p className="text-sm">{pkg.recipientAddress}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {pkg.weight && (
                      <div className="p-2 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Weight</p>
                        <p className="font-semibold">{pkg.weight} lbs</p>
                      </div>
                    )}

                    {pkg.dimensions && (
                      <div className="p-2 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Dimensions</p>
                        <p className="font-semibold text-xs">{pkg.dimensions}</p>
                      </div>
                    )}

                    {pkg.serviceLevel && (
                      <div className="p-2 bg-white rounded-lg">
                        <p className="text-xs text-gray-500">Service</p>
                        <p className="font-semibold capitalize text-xs">{pkg.serviceLevel}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-200">
                    <span>
                      Created: {pkg.createdAt?.toDate ? formatDate(pkg.createdAt.toDate()) : 'Just now'}
                    </span>
                    {pkg.estimatedDelivery?.toDate && (
                      <span>
                        Est. Delivery: {formatDate(pkg.estimatedDelivery.toDate())}
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

import { useEffect, useState } from 'react'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

interface CourierRateInfo {
  uid: string
  email: string
  packageBaseFare?: number
  packagePerMile?: number
  packageMaxPickup?: number
  packageMaxDelivery?: number
  foodBaseFare?: number
  foodPerMile?: number
  foodMaxPickup?: number
  foodMaxDelivery?: number
  packageEnabled: boolean
  foodEnabled: boolean
}

export default function RateCardsComparisonPage() {
  const [couriers, setCouriers] = useState<CourierRateInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'email' | 'packageRate' | 'foodRate'>('email')
  const [editingCourier, setEditingCourier] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<any>({})

  useEffect(() => {
    loadCouriers()
  }, [])

  const loadCouriers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'users'))
      const courierData: CourierRateInfo[] = []

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data()
        // Check for courier role (handle different role formats)
        const isCourier = data.role === 'courier' || data.role === 'runner' || data.role === 'driver'
        
        if (isCourier && data.courierProfile) {
          const profile = data.courierProfile
          courierData.push({
            uid: docSnap.id,
            email: data.email || 'N/A',
            packageBaseFare: profile.packageRateCard?.baseFare,
            packagePerMile: profile.packageRateCard?.perMile,
            packageMaxPickup: profile.packageRateCard?.maxPickupDistanceMiles,
            packageMaxDelivery: profile.packageRateCard?.maxDeliveryDistanceMiles,
            foodBaseFare: profile.foodRateCard?.baseFare,
            foodPerMile: profile.foodRateCard?.perMile,
            foodMaxPickup: profile.foodRateCard?.maxPickupDistanceMiles,
            foodMaxDelivery: profile.foodRateCard?.maxDeliveryDistanceMiles,
            packageEnabled: profile.workModes?.packagesEnabled || false,
            foodEnabled: profile.workModes?.foodEnabled || false,
          })
        }
      }

      setCouriers(courierData)
    } catch (error) {
      console.error('Error loading couriers:', error)
    } finally {
      setLoading(false)
    }
  }

  const getBestPackageRate = () => {
    const rates = couriers.filter(c => c.packageBaseFare && c.packageBaseFare > 0).map(c => c.packageBaseFare!)
    return rates.length > 0 ? Math.min(...rates) : null
  }

  const getBestFoodRate = () => {
    const rates = couriers.filter(c => c.foodBaseFare && c.foodBaseFare > 0).map(c => c.foodBaseFare!)
    return rates.length > 0 ? Math.min(...rates) : null
  }

  const getAveragePackageRate = () => {
    const rates = couriers.filter(c => c.packageBaseFare && c.packageBaseFare > 0).map(c => c.packageBaseFare!)
    return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null
  }

  const getAverageFoodRate = () => {
    const rates = couriers.filter(c => c.foodBaseFare && c.foodBaseFare > 0).map(c => c.foodBaseFare!)
    return rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : null
  }

  const getActivePackageCouriers = () => {
    return couriers.filter(c => c.packageEnabled && c.packageBaseFare).length
  }

  const getActiveFoodCouriers = () => {
    return couriers.filter(c => c.foodEnabled && c.foodBaseFare).length
  }
  const sortedCouriers = [...couriers].sort((a, b) => {
    if (sortBy === 'email') return a.email.localeCompare(b.email)
    if (sortBy === 'packageRate') return (a.packageBaseFare || Infinity) - (b.packageBaseFare || Infinity)
    if (sortBy === 'foodRate') return (a.foodBaseFare || Infinity) - (b.foodBaseFare || Infinity)
    return 0
  })

  if (loading) {
    return <div className="p-6 text-center">Loading rate cards...</div>
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-2">💰 Rate Cards Comparison</h1>
          <p className="text-purple-100">{couriers.length} couriers with rate cards</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Market Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">📦 Package Delivery</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Best Base Rate:</span>
                <span className="text-2xl font-bold text-green-600">
                  {getBestPackageRate() ? `$${getBestPackageRate()!.toFixed(2)}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Average Base Rate:</span>
                <span className="font-semibold">
                  {getAveragePackageRate() ? `$${getAveragePackageRate()!.toFixed(2)}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Active Couriers:</span>
                <span className="font-semibold">{getActivePackageCouriers()}/{couriers.length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-orange-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🍔 Food Delivery</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Best Base Rate:</span>
                <span className="text-2xl font-bold text-green-600">
                  {getBestFoodRate() ? `$${getBestFoodRate()!.toFixed(2)}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Average Base Rate:</span>
                <span className="font-semibold">
                  {getAverageFoodRate() ? `$${getAverageFoodRate()!.toFixed(2)}` : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Active Couriers:</span>
                <span className="font-semibold">{getActiveFoodCouriers()}/{couriers.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex gap-2">
            {(['email', 'packageRate', 'foodRate'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSortBy(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  sortBy === type
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type === 'email' && 'Sort by Email'}
                {type === 'packageRate' && 'Sort by Package Rate'}
                {type === 'foodRate' && 'Sort by Food Rate'}
              </button>
            ))}
          </div>
        </div>

        {/* Couriers Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">📦 Package Rate</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">📦 Max Distance</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">🍔 Food Rate</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">🍔 Max Distance</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedCouriers.map((courier, idx) => (
                  <tr key={courier.uid} className={`border-b border-gray-200 hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{courier.email}</td>
                    <td className="px-6 py-4">
                      {courier.packageBaseFare ? (
                        <div className="text-sm">
                          <span className="font-semibold text-gray-900">${courier.packageBaseFare.toFixed(2)}</span>
                          <span className="text-gray-500"> + ${courier.packagePerMile?.toFixed(2)}/mi</span>
                          {courier.packageBaseFare === getBestPackageRate() && (
                            <span className="ml-2 inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">BEST</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Not Set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {courier.packageMaxPickup ? `${courier.packageMaxPickup}mi pickup` : 'Unlimited'}
                      {courier.packageMaxDelivery && ` / ${courier.packageMaxDelivery}mi trip`}
                    </td>
                    <td className="px-6 py-4">
                      {courier.foodBaseFare ? (
                        <div className="text-sm">
                          <span className="font-semibold text-gray-900">${courier.foodBaseFare.toFixed(2)}</span>
                          <span className="text-gray-500"> + ${courier.foodPerMile?.toFixed(2)}/mi</span>
                          {courier.foodBaseFare === getBestFoodRate() && (
                            <span className="ml-2 inline-block bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">BEST</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">Not Set</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {courier.foodMaxPickup ? `${courier.foodMaxPickup}mi pickup` : 'Unlimited'}
                      {courier.foodMaxDelivery && ` / ${courier.foodMaxDelivery}mi trip`}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        {courier.packageEnabled && <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded">📦</span>}
                        {courier.foodEnabled && <span className="inline-block px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded">🍔</span>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

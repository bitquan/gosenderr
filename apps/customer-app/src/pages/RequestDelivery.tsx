import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../hooks/useAuth'
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card'
import { AddressAutocomplete } from '../components/AddressAutocomplete'

interface LocationData {
  address: string
  lat: number
  lng: number
}

interface DeliveryForm {
  pickup: LocationData | null
  delivery: LocationData | null
  pickupPhone: string
  deliveryPhone: string
  itemDescription: string
  specialInstructions: string
  vehicleType: 'car' | 'bike' | 'van'
}
: null,
    delivery: null RequestDeliveryPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<DeliveryForm>({
    pickupAddress: '',
    deliveryAddress: '',
    pickupPhone: '',
    deliveryPhone: '',
    itemDescription: '',
    specialInstructions: '',
    vehicleType: 'car'
  })

  // Base pricing calculation (simplified for now)
  const calculateEstimate = () => {
    const baseFee = 15
    const vehicleFees = { car: 0, bike: -5, van: 10 }
    return baseFee + vehicleFees[form.vehicleType]
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      setError('You must be logged in to request delivery')
      return
    }

    if (!form.pickup || !form.delivery) {
      setError('Please select both pickup and delivery addresses from the suggestions')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const jobData = {
        createdByUid: user.uid,
        createdByEmail: user.email,
        pickupAddress: form.pickup.address,
        pickupLat: form.pickup.lat,
        pickupLng: form.pickup.lng,
        deliveryAddress: form.delivery.address,
        deliveryLat: form.delivery.lat,
        deliveryLng: form.delivery.lng,
        pickupPhone: form.pickupPhone,
        deliveryPhone: form.deliveryPhone,
        description: form.itemDescription,
        specialInstructions: form.specialInstructions,
        vehicleType: form.vehicleType,
        status: 'pending',
        agreedFee: calculateEstimate(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      const docRef = await addDoc(collection(db, 'jobs'), jobData)
      console.log('Job created:', docRef.id)
      
      // Redirect to jobs page
      navigate('/jobs')
    } catch (err: any) {
      console.error('Error creating job:', err)
      setError(err.message || 'Failed to create delivery request')
    } finally {
      setLoading(false)
    }
  }

  const estimate = calculateEstimate()

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Request Delivery</h1>
        <p className="text-gray-600">Tell us where to pick up and deliver your item</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pickup Information */}
        <Card>
          <CardHeader>
            <CardTitle>📍 Pickup Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddressAutocomplete
              label="Pickup Address"
              placeholder="Start typing an address..."
              required
              value={form.pickup?.address || ''}
              onSelect={(result) => setForm({ ...form, pickup: result })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup Phone
              </label>
              <input
                type="tel"
                value={form.pickupPhone}
                onChange={(e) => setForm({ ...form, pickupPhone: e.target.value })}
                placeholder="(555) 123-4567"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Delivery Information */}
        <Card>
          <CardHeader>
            <CardTitle>🎯 Delivery Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddressAutocomplete
              label="Delivery Address"
              placeholder="Start typing an address..."
              required
              value={form.delivery?.address || ''}
              onSelect={(result) => setForm({ ...form, delivery: result })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Delivery Phone
              </label>
              <input
                type="tel"
                value={form.deliveryPhone}
                onChange={(e) => setForm({ ...form, deliveryPhone: e.target.value })}
                placeholder="(555) 987-6543"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Item Details */}
        <Card>
          <CardHeader>
            <CardTitle>📦 Item Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What are you sending? *
              </label>
              <textarea
                required
                value={form.itemDescription}
                onChange={(e) => setForm({ ...form, itemDescription: e.target.value })}
                placeholder="E.g., Small package, Documents, Food delivery..."
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Type
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, vehicleType: 'bike' })}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    form.vehicleType === 'bike'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">🚲</div>
                  <div className="font-medium text-sm">Bike</div>
                  <div className="text-xs text-gray-500">Small items</div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, vehicleType: 'car' })}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    form.vehicleType === 'car'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">🚗</div>
                  <div className="font-medium text-sm">Car</div>
                  <div className="text-xs text-gray-500">Standard</div>
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, vehicleType: 'van' })}
                  className={`p-4 border-2 rounded-lg text-center transition-all ${
                    form.vehicleType === 'van'
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">🚐</div>
                  <div className="font-medium text-sm">Van</div>
                  <div className="text-xs text-gray-500">Large items</div>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Special Instructions
              </label>
              <textarea
                value={form.specialInstructions}
                onChange={(e) => setForm({ ...form, specialInstructions: e.target.value })}
                placeholder="Any special handling or delivery instructions..."
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </CardContent>
        </Card>

        {/* Price Estimate */}
        <Card variant="elevated" className="bg-gradient-to-br from-primary-50 to-primary-100">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Estimated Cost</p>
                <p className="text-sm text-gray-500">Final price may vary based on distance</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-primary-700">${estimate}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Request Delivery'}
          </button>
        </div>
      </form>
    </div>
  )
}


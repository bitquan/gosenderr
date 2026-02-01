import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../../../contexts/CartContext'
import { useAuth } from '../../../hooks/useAuth'
import { Elements } from '@stripe/react-stripe-js'
import { PaymentForm } from '../../../components/checkout/PaymentForm'
import { getStripePromise } from '@/lib/stripeConfig'

// Initialize Stripe
const stripePromise = getStripePromise()

interface ShippingFormData {
  fullName: string
  email: string
  phone: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
}

export default function MarketplaceCheckoutPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { items, subtotal, clearCart } = useCart()
  const [step, setStep] = useState<'shipping' | 'payment'>('shipping')
  const [shippingInfo, setShippingInfo] = useState<ShippingFormData>({
    fullName: '',
    email: user?.email || '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'United States',
  })

  const shippingCost = 0 // Free shipping for marketplace
  const tax = subtotal * 0.08 // 8% tax (should be calculated based on location)
  const total = subtotal + shippingCost + tax

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      navigate('/marketplace')
    }
  }, [items.length, navigate])

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    const requiredFields: (keyof ShippingFormData)[] = ['fullName', 'email', 'phone', 'address', 'city', 'state', 'zipCode']
    const isValid = requiredFields.every(field => shippingInfo[field].trim() !== '')
    
    if (!isValid) {
      alert('Please fill in all required fields')
      return
    }
    
    setStep('payment')
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setShippingInfo(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handlePaymentSuccess = async (orderId: string) => {
    clearCart()
    navigate(`/orders/${orderId}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className={`flex items-center ${step === 'shipping' ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'shipping' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
              }`}>
                {step === 'payment' ? '✓' : '1'}
              </div>
              <span className="ml-2 font-medium">Shipping</span>
            </div>
            <div className="w-16 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center ${step === 'payment' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step === 'payment' ? 'bg-blue-600 text-white' : 'bg-gray-300'
              }`}>
                2
              </div>
              <span className="ml-2 font-medium">Payment</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              {step === 'shipping' ? (
                <>
                  <h2 className="text-2xl font-bold mb-6">Shipping Information</h2>
                  <form onSubmit={handleShippingSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={shippingInfo.fullName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={shippingInfo.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone *
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={shippingInfo.phone}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address *
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={shippingInfo.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Street address"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          name="city"
                          value={shippingInfo.city}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          State *
                        </label>
                        <input
                          type="text"
                          name="state"
                          value={shippingInfo.state}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          ZIP Code *
                        </label>
                        <input
                          type="text"
                          name="zipCode"
                          value={shippingInfo.zipCode}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country *
                      </label>
                      <select
                        name="country"
                        value={shippingInfo.country}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="Mexico">Mexico</option>
                      </select>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button
                        type="button"
                        onClick={() => navigate('/marketplace')}
                        className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                      >
                        Back to Shopping
                      </button>
                      <button
                        type="submit"
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                      >
                        Continue to Payment
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold mb-2">Payment</h2>
                    <button
                      onClick={() => setStep('shipping')}
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      ← Edit shipping information
                    </button>
                  </div>
                  
                  <Elements stripe={stripePromise}>
                    <PaymentForm
                      amount={total}
                      shippingInfo={shippingInfo}
                      items={items}
                      onSuccess={handlePaymentSuccess}
                    />
                  </Elements>
                </>
              )}
            </div>
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-4">
              <h3 className="text-lg font-bold mb-4">Order Summary</h3>
              
              <div className="space-y-4 mb-6">
                {items.map((cartItem) => (
                  <div key={cartItem.item.id} className="flex gap-4">
                    <img
                      src={cartItem.item.images[0]}
                      alt={cartItem.item.title}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{cartItem.item.title}</p>
                      <p className="text-sm text-gray-600">Qty: {cartItem.quantity}</p>
                      <p className="text-sm font-medium">${(cartItem.item.price * cartItem.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className="font-medium text-green-600">FREE</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="font-medium">${tax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-bold">Total</span>
                  <span className="font-bold text-lg">${total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-900">
                    <p className="font-medium">Secure Checkout</p>
                    <p className="text-blue-700">Your payment information is encrypted and secure.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

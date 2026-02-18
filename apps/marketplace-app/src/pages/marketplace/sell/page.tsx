import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../contexts/AuthContext'
import { marketplaceService } from '../../../services/marketplace.service'
import { ItemCategory, ItemCondition, DeliveryOption } from '../../../types/marketplace'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../../lib/firebase/client'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../../lib/firebase/client'

/**
 * Sell Page - Create new marketplace listing (Phase 2)
 * Any authenticated user can create a listing and become a seller
 */
export default function SellPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: 'electronics' as ItemCategory,
    condition: 'good' as ItemCondition,
    quantity: '1',
    deliveryOptions: ['courier'] as DeliveryOption[],
    pickupAddress: ''
  })
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])
  const [sellerStatus, setSellerStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none')
  const [sellerRejectionReason, setSellerRejectionReason] = useState<string | null>(null)
  const [sellerStatusLoading, setSellerStatusLoading] = useState(true)

  useEffect(() => {
    const loadSellerStatus = async () => {
      if (!user) {
        setSellerStatusLoading(false)
        return
      }

      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid))
        const userData = userSnap.data()
        const roles = Array.isArray(userData?.roles) ? userData.roles : []
        const hasSellerRole = userData?.role === 'seller' || roles.includes('seller')

        if (hasSellerRole || userData?.sellerApplication?.status === 'approved') {
          setSellerStatus('approved')
          setSellerRejectionReason(null)
        } else if (userData?.sellerApplication?.status === 'pending') {
          setSellerStatus('pending')
          setSellerRejectionReason(null)
        } else if (userData?.sellerApplication?.status === 'rejected') {
          setSellerStatus('rejected')
          setSellerRejectionReason(userData?.sellerApplication?.rejectionReason || null)
        } else {
          setSellerStatus('none')
          setSellerRejectionReason(null)
        }
      } catch (error) {
        console.error('Failed to load seller status:', error)
      } finally {
        setSellerStatusLoading(false)
      }
    }

    loadSellerStatus()
  }, [user])

  const categories: ItemCategory[] = [
    ItemCategory.ELECTRONICS,
    ItemCategory.CLOTHING,
    ItemCategory.HOME,
    ItemCategory.BOOKS,
    ItemCategory.TOYS,
    ItemCategory.SPORTS,
    ItemCategory.AUTOMOTIVE,
    ItemCategory.OTHER,
  ]

  const conditions: ItemCondition[] = [
    ItemCondition.NEW,
    ItemCondition.LIKE_NEW,
    ItemCondition.GOOD,
    ItemCondition.FAIR,
    ItemCondition.POOR,
  ]

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length + photos.length > 6) {
      alert('Maximum 6 photos allowed')
      return
    }

    setPhotos([...photos, ...files])
    
    // Create preview URLs
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreviewUrls(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
    setPhotoPreviewUrls(photoPreviewUrls.filter((_, i) => i !== index))
  }

  const uploadPhotos = async (): Promise<string[]> => {
    if (!user) throw new Error('Must be logged in')
    
    setUploading(true)
    const photoUrls: string[] = []

    try {
      for (const photo of photos) {
        const fileName = `marketplace/${user.uid}/${Date.now()}_${photo.name}`
        const storageRef = ref(storage, fileName)
        await uploadBytes(storageRef, photo)
        const url = await getDownloadURL(storageRef)
        photoUrls.push(url)
      }
      return photoUrls
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      navigate('/login')
      return
    }

    if (sellerStatus !== 'approved') {
      alert('Your seller application must be approved before creating listings.')
      return
    }

    if (photos.length === 0) {
      alert('Please add at least one photo')
      return
    }

    setLoading(true)
    try {
      // Upload photos first
      const photoUrls = await uploadPhotos()

      // Create listing
      const listingId = await marketplaceService.createListing({
        title: formData.title,
        description: formData.description,
        category: formData.category,
        condition: formData.condition,
        price: parseFloat(formData.price),
        quantity: parseInt(formData.quantity),
        photos: photoUrls,
        deliveryOptions: formData.deliveryOptions
      })

      // Navigate to the new listing
      navigate(`/marketplace/${listingId}`)
    } catch (error) {
      console.error('Error creating listing:', error)
      alert('Failed to create listing. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const toggleDeliveryOption = (option: DeliveryOption) => {
    if (formData.deliveryOptions.includes(option)) {
      setFormData({
        ...formData,
        deliveryOptions: formData.deliveryOptions.filter(o => o !== option)
      })
    } else {
      setFormData({
        ...formData,
        deliveryOptions: [...formData.deliveryOptions, option]
      })
    }
  }

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h2 className="text-2xl font-bold mb-4">Sign in to sell</h2>
        <p className="text-gray-600 mb-6">You need to be logged in to create listings</p>
        <button
          onClick={() => navigate('/login')}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Sign In
        </button>
      </div>
    )
  }

  if (sellerStatusLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-600">Checking seller status...</p>
      </div>
    )
  }

  if (sellerStatus !== 'approved') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="text-5xl mb-4">🏪</div>
          {sellerStatus === 'pending' && (
            <>
              <h2 className="text-2xl font-bold mb-2">Seller Application Pending</h2>
              <p className="text-gray-600 mb-6">
                Your application is under review. You'll be notified once approved.
              </p>
            </>
          )}
          {sellerStatus === 'rejected' && (
            <>
              <h2 className="text-2xl font-bold mb-2">Application Rejected</h2>
              <p className="text-gray-600 mb-6">
                {sellerRejectionReason || 'Your application was not approved. Please review and resubmit.'}
              </p>
              <button
                onClick={() => navigate('/seller/apply')}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg font-semibold"
              >
                Resubmit Application
              </button>
            </>
          )}
          {sellerStatus === 'none' && (
            <>
              <h2 className="text-2xl font-bold mb-2">Apply to Become a Seller</h2>
              <p className="text-gray-600 mb-6">
                Complete the seller application to start listing items on the marketplace.
              </p>
              <button
                onClick={() => navigate('/seller/apply')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold"
              >
                Apply Now
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Create Listing</h1>
      <p className="text-gray-600 mb-8">
        List an item for sale and become a seller on GoSenderr Marketplace
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Photos */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Photos <span className="text-red-500">*</span>
          </label>
          
          <div className="grid grid-cols-3 gap-4 mb-4">
            {photoPreviewUrls.map((url, index) => (
              <div key={index} className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center hover:bg-red-700"
                >
                  ×
                </button>
              </div>
            ))}
            
            {photos.length < 6 && (
              <label className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-sm text-gray-600">Add Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>
          <p className="text-sm text-gray-500">Add up to 6 photos. First photo will be the cover image.</p>
        </div>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., iPhone 13 Pro Max 256GB"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            required
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Describe your item in detail..."
            rows={6}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            maxLength={2000}
          />
          <p className="text-sm text-gray-500 mt-1">{formData.description.length}/2000</p>
        </div>

        {/* Category & Condition */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ItemCategory })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize"
            >
              {categories.map(cat => (
                <option key={cat} value={cat} className="capitalize">{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Condition <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value as ItemCondition })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent capitalize"
            >
              {conditions.map(cond => (
                <option key={cond} value={cond} className="capitalize">
                  {cond.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price & Quantity */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-gray-500">$</span>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              required
              min="1"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="1"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Delivery Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Delivery Options <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {(['courier', 'pickup', 'shipping'] as DeliveryOption[]).map(option => (
              <label key={option} className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.deliveryOptions.includes(option)}
                  onChange={() => toggleDeliveryOption(option)}
                  className="w-5 h-5 text-blue-600 rounded"
                />
                <div>
                  <div className="font-medium capitalize">{option}</div>
                  <div className="text-sm text-gray-500">
                    {option === 'courier' && 'Local courier delivery'}
                    {option === 'pickup' && 'Buyer picks up from you'}
                    {option === 'shipping' && 'Ship to buyer'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-6">
          <button
            type="button"
            onClick={() => navigate('/marketplace')}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || uploading || photos.length === 0}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading photos...' : loading ? 'Creating...' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  )
}

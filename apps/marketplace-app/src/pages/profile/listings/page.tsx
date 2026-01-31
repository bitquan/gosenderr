import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/useAuth'
import { marketplaceService } from '../../../services/marketplace.service'
import { MarketplaceItem } from '../../../types/marketplace'

export default function MyListingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [listings, setListings] = useState<MarketplaceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalListings: 0,
    totalViews: 0,
    totalSold: 0
  })

  useEffect(() => {
    loadListings()
  }, [user])

  const loadListings = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      const items = await marketplaceService.getSellerListings(user.uid)
      setListings(items)
      
      // Calculate stats
      const totalViews = items.reduce((sum, item) => sum + item.views, 0)
      const totalSold = items.reduce((sum, item) => sum + (item.soldCount || 0), 0)
      
      setStats({
        totalListings: items.length,
        totalViews,
        totalSold
      })
    } catch (error) {
      console.error('Error loading listings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return
    
    try {
      await marketplaceService.deleteListing(itemId)
      await loadListings() // Reload
    } catch (error) {
      console.error('Error deleting listing:', error)
      alert('Failed to delete listing')
    }
  }

  const handleMarkSold = async (itemId: string) => {
    try {
      const item = listings.find(i => i.id === itemId)
      if (!item) return
      
      await marketplaceService.updateListing(itemId, {
        status: 'sold',
        isActive: false,
        soldCount: (item.soldCount || 0) + 1
      } as any)
      await loadListings() // Reload
    } catch (error) {
      console.error('Error marking as sold:', error)
      alert('Failed to mark as sold')
    }
  }

  const handleReactivate = async (itemId: string) => {
    try {
      await marketplaceService.updateListing(itemId, {
        status: 'active',
        isActive: true
      } as any)
      await loadListings() // Reload
    } catch (error) {
      console.error('Error reactivating:', error)
      alert('Failed to reactivate listing')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your listings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Listings</h1>
              <p className="text-gray-600 mt-1">Manage your marketplace items</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/profile/seller-settings')}
                className="px-4 py-3 bg-white border-2 border-purple-600 text-purple-600 font-semibold rounded-lg hover:bg-purple-50 transition-all"
              >
                ⚙️ Settings & Badges
              </button>
              <button
                onClick={() => navigate('/marketplace/sell')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg"
              >
                + Create New Listing
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Listings</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalListings}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📦</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Views</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalViews}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">👁️</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Items Sold</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalSold}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">💰</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Listings Grid */}
        {listings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center border border-gray-200">
            <div className="text-6xl mb-4">🛍️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No listings yet</h3>
            <p className="text-gray-600 mb-6">Start selling by creating your first listing!</p>
            <button
              onClick={() => navigate('/marketplace/sell')}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              Create Your First Listing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
                {/* Image */}
                <div 
                  className="relative h-48 bg-gray-200 cursor-pointer"
                  onClick={() => navigate(`/marketplace/${item.id}`)}
                >
                  {item.photos[0] ? (
                    <img
                      src={item.photos[0]}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      📦
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                    {item.status === 'sold' ? (
                      <span className="px-3 py-1 bg-gray-900 text-white text-xs font-semibold rounded-full">
                        SOLD
                      </span>
                    ) : item.isActive ? (
                      <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-full">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full">
                        INACTIVE
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 
                    className="font-semibold text-gray-900 mb-1 cursor-pointer hover:text-purple-600 line-clamp-1"
                    onClick={() => navigate(`/marketplace/${item.id}`)}
                  >
                    {item.title}
                  </h3>
                  <p className="text-2xl font-bold text-purple-600 mb-2">
                    ${item.price.toFixed(2)}
                  </p>
                  
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                    <span className="flex items-center gap-1">
                      👁️ {item.views} views
                    </span>
                    <span className="flex items-center gap-1">
                      📦 {item.quantity} left
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/marketplace/${item.id}`)}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition"
                    >
                      View
                    </button>
                    
                    {item.status !== 'sold' && (
                      <>
                        <button
                          onClick={() => handleMarkSold(item.id)}
                          className="flex-1 px-3 py-2 bg-green-100 text-green-700 text-sm font-medium rounded-lg hover:bg-green-200 transition"
                        >
                          Mark Sold
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="px-3 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                    
                    {item.status === 'sold' && (
                      <button
                        onClick={() => handleReactivate(item.id)}
                        className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg hover:bg-blue-200 transition"
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

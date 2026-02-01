import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { Card, CardContent } from '../components/Card'
import { exportToCSV, formatItemsForExport } from '../lib/csvExport'

interface MarketplaceItem {
  id: string
  title: string
  description: string
  price: number
  category: string
  condition: string
  images: string[]
  stock: number
  sellerId: string
  sellerName: string
  status: string
  featured: boolean
  createdAt?: any
  updatedAt?: any
}

export default function AdminMarketplacePage() {
  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'inactive'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'marketplaceItems'))
      const itemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MarketplaceItem[]
      setItems(itemsData)
    } catch (error) {
      console.error('Error loading marketplace items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (itemId: string, newStatus: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    try {
      await updateDoc(doc(db, 'marketplaceItems', itemId), {
        status: newStatus,
        updatedAt: new Date()
      })
      setItems(items.map(item => 
        item.id === itemId ? { ...item, status: newStatus } : item
      ))
    } catch (error) {
      console.error('Error updating item status:', error)
    }
  }

  const handleFeatureToggle = async (itemId: string, featured: boolean, e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    try {
      await updateDoc(doc(db, 'marketplaceItems', itemId), {
        featured: !featured,
        updatedAt: new Date()
      })
      setItems(items.map(item => 
        item.id === itemId ? { ...item, featured: !featured } : item
      ))
    } catch (error) {
      console.error('Error toggling featured:', error)
    }
  }

  const handleDeleteItem = async (itemId: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault()
    if (!confirm('Are you sure you want to delete this item? This cannot be undone.')) return
    
    try {
      await deleteDoc(doc(db, 'marketplaceItems', itemId))
      setItems(items.filter(item => item.id !== itemId))
    } catch (error) {
      console.error('Error deleting item:', error)
    }
  }

  const filteredItems = items.filter(item => {
    const matchesFilter = filter === 'all' || item.status === filter
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sellerName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    return matchesFilter && matchesSearch && matchesCategory
  })

  const categories = ['all', ...Array.from(new Set(items.map(item => item.category)))]
  const statusCounts = {
    all: items.length,
    active: items.filter(i => i.status === 'active').length,
    draft: items.filter(i => i.status === 'draft').length,
    inactive: items.filter(i => i.status === 'inactive').length
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700'
      case 'draft': return 'bg-yellow-100 text-yellow-700'
      case 'inactive': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FF] pb-8">
      <div className="bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] rounded-b-[32px] p-6 text-white shadow-lg">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">🛍️ Marketplace Management</h1>
            <p className="text-purple-100">{items.length} total items</p>
          </div>
          <button
            onClick={() => exportToCSV(formatItemsForExport(filteredItems), 'marketplace-items')}
            disabled={filteredItems.length === 0}
            className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
          >
            📥 Export CSV
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-6 space-y-4">
        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2 flex-wrap">
          {(['all', 'active', 'draft', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                filter === f
                  ? 'bg-gradient-to-br from-[#6B4EFF] to-[#9D7FFF] text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <span className="capitalize">{f}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  filter === f ? 'bg-white/20' : 'bg-gray-100'
                }`}>
                  {statusCounts[f]}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Search and Category Filter */}
        <div className="bg-white rounded-2xl shadow-lg p-4 flex gap-4 flex-wrap">
          <input
            type="text"
            placeholder="Search by title or seller..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[250px] px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'all' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Results Count */}
        {(searchQuery || selectedCategory !== 'all' || filter !== 'all') && (
          <p className="text-sm text-gray-600 px-2">
            Showing {filteredItems.length} of {items.length} total items
          </p>
        )}

        {/* Items List */}
        {loading ? (
          <div className="text-center py-12">Loading...</div>
        ) : filteredItems.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="p-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-gray-500 text-lg">No items found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <Link 
                key={item.id} 
                to={`/marketplace/${item.id}`}
                className="block"
              >
                <Card variant="elevated" className="hover:shadow-xl transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                  <div className="flex gap-6">
                    {/* Item Image */}
                    <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.images?.[0] ? (
                        <img 
                          src={item.images[0]} 
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-3xl">
                          📦
                        </div>
                      )}
                    </div>

                    {/* Item Details */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                          <p className="text-sm text-gray-600">by {item.sellerName}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.featured && (
                            <span className="px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                              ⭐ Featured
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                        <span className="font-semibold text-gray-900 text-lg">
                          ${item.price.toFixed(2)}
                        </span>
                        <span>•</span>
                        <span>{item.category}</span>
                        <span>•</span>
                        <span>{item.condition}</span>
                        <span>•</span>
                        <span className={item.stock <= 5 ? 'text-red-600 font-semibold' : ''}>
                          Stock: {item.stock}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 flex-wrap" onClick={(e) => e.preventDefault()}>
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                          <option value="draft">Draft</option>
                        </select>

                        <button
                          onClick={(e) => handleFeatureToggle(item.id, item.featured, e)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            item.featured
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {item.featured ? '⭐ Unfeature' : '☆ Feature'}
                        </button>

                        <button
                          onClick={(e) => handleDeleteItem(item.id, e)}
                          className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

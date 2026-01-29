import { useState, useEffect } from 'react'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { db } from '../../lib/firebase/client'
import { MarketplaceItem } from '@gosenderr/shared'
import { SearchBar } from '../../components/marketplace/SearchBar'
import { CategoryNav } from '../../components/marketplace/CategoryNav'
import { FilterSidebar, FilterOptions } from '../../components/marketplace/FilterSidebar'
import { ItemGrid } from '../../components/marketplace/ItemGrid'

/**
 * MarketplaceHome - Main marketplace page for browsing items
 */
export default function MarketplaceHome() {
  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: [0, 10000],
    conditions: [],
    sortBy: 'date_desc',
  })

  const categories = [
    'Electronics',
    'Clothing',
    'Home',
    'Books',
    'Toys',
    'Sports',
    'Beauty',
    'Automotive',
    'Other',
  ]

  useEffect(() => {
    fetchItems()
  }, [selectedCategory, filters])

  const fetchItems = async () => {
    setLoading(true)
    try {
      let q = query(
        collection(db, 'marketplaceItems'),
        where('status', '==', 'active')
      )

      // Add category filter
      if (selectedCategory) {
        q = query(q, where('category', '==', selectedCategory))
      }

      // Add condition filter
      if (filters.conditions.length > 0) {
        q = query(q, where('condition', 'in', filters.conditions))
      }

      // Add sorting
      const [sortField, sortDirection] = filters.sortBy.split('_') as [string, 'asc' | 'desc']
      const field = sortField === 'date' ? 'createdAt' : 'price'
      q = query(q, orderBy(field, sortDirection))

      // Limit results
      q = query(q, limit(50))

      const snapshot = await getDocs(q)
      let fetchedItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MarketplaceItem[]

      // Client-side price filter (since Firestore doesn't support range queries with other filters)
      fetchedItems = fetchedItems.filter(
        (item) => item.price >= filters.priceRange[0] && item.price <= filters.priceRange[1]
      )

      // Client-side search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        fetchedItems = fetchedItems.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.description.toLowerCase().includes(query) ||
            item.category.toLowerCase().includes(query)
        )
      }

      setItems(fetchedItems)
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    // Re-fetch with current filters
    fetchItems()
  }

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Welcome to GoSenderR Marketplace
          </h1>
          <p className="text-xl text-purple-100 mb-8">
            Discover amazing products from trusted vendors
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl">
            <SearchBar
              onSearch={handleSearch}
              placeholder="Search for items..."
              initialValue={searchQuery}
            />
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <CategoryNav
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters - Desktop */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <FilterSidebar filters={filters} onFilterChange={handleFilterChange} />
          </aside>

          {/* Mobile Filter Button */}
          <div className="lg:hidden">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="w-full px-4 py-2 bg-white border border-gray-300 rounded-lg flex items-center justify-center space-x-2 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span className="font-medium">Filters</span>
            </button>

            {/* Mobile Filter Sidebar */}
            {showFilters && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowFilters(false)}>
                <div
                  className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-xl overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4">
                    <FilterSidebar
                      filters={filters}
                      onFilterChange={handleFilterChange}
                      onClose={() => setShowFilters(false)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Items Grid */}
          <div className="flex-1">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {selectedCategory || 'All Items'}
              </h2>
              <p className="text-gray-600 mt-1">
                {loading ? 'Loading...' : `${items.length} items found`}
              </p>
            </div>

            <ItemGrid items={items} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  )
}

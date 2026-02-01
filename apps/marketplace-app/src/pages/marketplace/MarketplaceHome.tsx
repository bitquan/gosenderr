import { useState, useEffect } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase/client'
import { marketplaceService } from '../../services/marketplace.service'
import { ItemCategory, ItemCondition } from '../../types/marketplace'
import type { MarketplaceItem } from '../../types/marketplace'
import { SearchBar } from '../../components/marketplace/SearchBar'
import { CategoryNav } from '../../components/marketplace/CategoryNav'
import { FilterSidebar, FilterOptions } from '../../components/marketplace/FilterSidebar'
import { ItemGrid } from '../../components/marketplace/ItemGrid'

/**
 * MarketplaceHome - Main marketplace page for browsing items (Phase 2)
 * Unified model: Browse items from sellers (who are just users with sellerProfile)
 */
export default function MarketplaceHome() {
  const [items, setItems] = useState<MarketplaceItem[]>([])
  const [sellerBadgesMap, setSellerBadgesMap] = useState<Record<string, string[]>>({})
  const [sellerRatingsMap, setSellerRatingsMap] = useState<Record<string, { average: number; count: number }>>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: [0, 10000],
    conditions: [],
    sortBy: 'date_desc',
    badgeFilters: {
      buyerProtectionOnly: false,
      topRatedOnly: false,
      verifiedOnly: false
    }
  })

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

  useEffect(() => {
    fetchItems()
  }, [selectedCategory, filters, searchQuery])

  const fetchItems = async () => {
    setLoading(true)
    try {
      let fetchedItems: MarketplaceItem[] = []

      // If search query, use search
      if (searchQuery) {
        fetchedItems = await marketplaceService.searchItems(searchQuery)
      } else {
        // Otherwise use filters
        fetchedItems = await marketplaceService.getItems({
          category: selectedCategory || undefined,
          condition: filters.conditions.length > 0 ? filters.conditions[0] as ItemCondition : undefined,
          minPrice: filters.priceRange[0],
          maxPrice: filters.priceRange[1],
          sortBy: (filters.sortBy === 'date_asc' ? 'date_desc' : filters.sortBy),
          limit: 50
        })
      }

      // Fetch seller badges + ratings for each item
      const uniqueSellerIds = [...new Set(fetchedItems.map(item => item.sellerId))]
      const badgesMap: Record<string, string[]> = {}
      const ratingsMap: Record<string, { average: number; count: number }> = {}
      
      await Promise.all(
        uniqueSellerIds.map(async (sellerId) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', sellerId))
            if (userDoc.exists()) {
              const sellerProfile = userDoc.data().sellerProfile
              badgesMap[sellerId] = sellerProfile?.badges || []
              if (typeof sellerProfile?.ratingAvg === 'number' && typeof sellerProfile?.ratingCount === 'number') {
                ratingsMap[sellerId] = {
                  average: sellerProfile.ratingAvg,
                  count: sellerProfile.ratingCount
                }
              }
            }
          } catch (error) {
            console.error(`Error fetching badges for seller ${sellerId}:`, error)
            badgesMap[sellerId] = []
          }
        })
      )
      
      setSellerBadgesMap(badgesMap)
      setSellerRatingsMap(ratingsMap)
      
      // Apply badge filters
      let filteredItems = fetchedItems
      if (filters.badgeFilters?.buyerProtectionOnly) {
        filteredItems = filteredItems.filter(item => 
          badgesMap[item.sellerId]?.includes('buyer_protection')
        )
      }
      if (filters.badgeFilters?.topRatedOnly) {
        filteredItems = filteredItems.filter(item => 
          badgesMap[item.sellerId]?.includes('top_rated')
        )
      }
      if (filters.badgeFilters?.verifiedOnly) {
        filteredItems = filteredItems.filter(item => 
          badgesMap[item.sellerId]?.includes('verified')
        )
      }

      setItems(filteredItems)
    } catch (error) {
      console.error('Error fetching items:', error)
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters)
  }

  const handleCategorySelect = (category: string | null) => {
    setSelectedCategory(category as ItemCategory | null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            GoSenderr Marketplace
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Buy and sell anything, delivered by trusted couriers
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
        onSelectCategory={handleCategorySelect}
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

            <ItemGrid 
              items={items} 
              loading={loading}
              sellerBadgesMap={sellerBadgesMap}
              sellerRatingsMap={sellerRatingsMap}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

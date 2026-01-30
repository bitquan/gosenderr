import { useState } from 'react'
import { ItemCondition } from '@gosenderr/shared'

export interface FilterOptions {
  priceRange: [number, number]
  conditions: ItemCondition[]
  sortBy: 'price_asc' | 'price_desc' | 'date_desc' | 'date_asc'
}

interface FilterSidebarProps {
  filters: FilterOptions
  onFilterChange: (filters: FilterOptions) => void
  onClose?: () => void
}

/**
 * FilterSidebar - Filters for marketplace items
 */
export function FilterSidebar({ filters, onFilterChange, onClose }: FilterSidebarProps) {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters)

  const conditions: { value: ItemCondition; label: string }[] = [
    { value: 'new', label: 'New' },
    { value: 'like_new', label: 'Like New' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
  ]

  const sortOptions = [
    { value: 'date_desc', label: 'Newest First' },
    { value: 'date_asc', label: 'Oldest First' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
  ]

  const handleConditionToggle = (condition: ItemCondition) => {
    const newConditions = localFilters.conditions.includes(condition)
      ? localFilters.conditions.filter((c) => c !== condition)
      : [...localFilters.conditions, condition]
    
    const newFilters = { ...localFilters, conditions: newConditions }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handlePriceChange = (index: 0 | 1, value: number) => {
    const newRange: [number, number] = [...localFilters.priceRange]
    newRange[index] = value
    const newFilters = { ...localFilters, priceRange: newRange }
    setLocalFilters(newFilters)
  }

  const handlePriceApply = () => {
    onFilterChange(localFilters)
  }

  const handleSortChange = (sortBy: FilterOptions['sortBy']) => {
    const newFilters = { ...localFilters, sortBy }
    setLocalFilters(newFilters)
    onFilterChange(newFilters)
  }

  const handleReset = () => {
    const defaultFilters: FilterOptions = {
      priceRange: [0, 10000],
      conditions: [],
      sortBy: 'date_desc',
    }
    setLocalFilters(defaultFilters)
    onFilterChange(defaultFilters)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Sort By */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Sort By</h3>
          <div className="space-y-2">
            {sortOptions.map((option) => (
              <label key={option.value} className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="sortBy"
                  value={option.value}
                  checked={localFilters.sortBy === option.value}
                  onChange={() => handleSortChange(option.value as FilterOptions['sortBy'])}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Price Range</h3>
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={localFilters.priceRange[0]}
                onChange={(e) => handlePriceChange(0, Number(e.target.value))}
                placeholder="Min"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                value={localFilters.priceRange[1]}
                onChange={(e) => handlePriceChange(1, Number(e.target.value))}
                placeholder="Max"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handlePriceApply}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              Apply
            </button>
          </div>
        </div>

        {/* Condition */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Condition</h3>
          <div className="space-y-2">
            {conditions.map((condition) => (
              <label key={condition.value} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localFilters.conditions.includes(condition.value)}
                  onChange={() => handleConditionToggle(condition.value)}
                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                />
                <span className="ml-2 text-sm text-gray-700">{condition.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Reset */}
        <button
          onClick={handleReset}
          className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Reset Filters
        </button>
      </div>
    </div>
  )
}

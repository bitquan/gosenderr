interface CategoryNavProps {
  categories: string[]
  selectedCategory: string | null
  onSelectCategory: (category: string | null) => void
}

/**
 * CategoryNav - Category navigation bar
 */
export function CategoryNav({ categories, selectedCategory, onSelectCategory }: CategoryNavProps) {
  const allCategories = ['All', ...categories]

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      All: '🏪',
      Electronics: '💻',
      Clothing: '👕',
      Home: '🏠',
      Books: '📚',
      Toys: '🧸',
      Sports: '⚽',
      Beauty: '💄',
      Automotive: '🚗',
      Other: '📦',
    }
    return icons[category] || '📦'
  }

  return (
    <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-2 overflow-x-auto py-4 scrollbar-hide">
          {allCategories.map((category) => {
            const isSelected = category === 'All' 
              ? selectedCategory === null 
              : selectedCategory === category
            
            return (
              <button
                key={category}
                onClick={() => onSelectCategory(category === 'All' ? null : category)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap transition-all
                  ${isSelected
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                <span>{getCategoryIcon(category)}</span>
                <span className="font-medium">{category}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

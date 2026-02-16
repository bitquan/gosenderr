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
    const normalized = category.toLowerCase()
    const icons: Record<string, string> = {
      all: '🏪',
      electronics: '💻',
      clothing: '👕',
      food: '🍱',
      home: '🏠',
      books: '📚',
      toys: '🧸',
      sports: '⚽',
      beauty: '💄',
      automotive: '🚗',
      other: '📦',
    }
    return icons[normalized] || '📦'
  }

  const formatCategoryLabel = (category: string) => {
    if (category === 'All') return category
    return category
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <div className="relative mt-4 mb-4">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-0">
        <div className="flex items-center justify-center gap-3 overflow-x-auto py-4 scrollbar-hide rounded-3xl bg-slate-950/60 border border-white/10 shadow-2xl backdrop-blur">
          {allCategories.map((category) => {
            const isSelected =
              category === 'All' ? selectedCategory === null : selectedCategory === category

            return (
              <button
                key={category}
                onClick={() => onSelectCategory(category === 'All' ? null : category)}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-full whitespace-nowrap transition-all
                  ${isSelected
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                  }
                `}
              >
                <span>{getCategoryIcon(category)}</span>
                <span className="font-medium">{formatCategoryLabel(category)}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

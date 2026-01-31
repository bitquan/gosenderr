import { SellerBadge as BadgeType } from '../../types/marketplace'

interface SellerBadgeProps {
  badge: BadgeType
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

const badgeConfig = {
  [BadgeType.BUYER_PROTECTION]: {
    icon: '🛡️',
    label: 'Buyer Protection',
    color: 'bg-green-100 text-green-800 border-green-200',
    tooltip: '3-day fund hold, returns guaranteed'
  },
  [BadgeType.TOP_RATED]: {
    icon: '⭐',
    label: 'Top Rated',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    tooltip: '4.8+ rating, 50+ sales, <1% disputes'
  },
  [BadgeType.VERIFIED]: {
    icon: '✓',
    label: 'Verified',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    tooltip: 'Identity verified seller'
  },
  [BadgeType.FAST_SHIPPER]: {
    icon: '📦',
    label: 'Fast Shipper',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    tooltip: 'Ships within 24 hours'
  },
  [BadgeType.QUICK_RESPONDER]: {
    icon: '💬',
    label: 'Quick Reply',
    color: 'bg-pink-100 text-pink-800 border-pink-200',
    tooltip: 'Replies within 2 hours'
  },
  [BadgeType.RETURNS_ACCEPTED]: {
    icon: '🔄',
    label: 'Returns',
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    tooltip: 'Free returns accepted'
  }
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5'
}

export function SellerBadge({ badge, size = 'md', showLabel = true }: SellerBadgeProps) {
  const config = badgeConfig[badge]
  
  if (!config) return null
  
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium border ${config.color} ${sizeClasses[size]}`}
      title={config.tooltip}
    >
      <span>{config.icon}</span>
      {showLabel && <span>{config.label}</span>}
    </span>
  )
}

interface SellerBadgeListProps {
  badges: BadgeType[]
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  maxDisplay?: number
}

export function SellerBadgeList({ badges, size = 'sm', showLabel = false, maxDisplay = 3 }: SellerBadgeListProps) {
  if (!badges || badges.length === 0) return null
  
  const displayBadges = badges.slice(0, maxDisplay)
  const remaining = badges.length - maxDisplay
  
  return (
    <div className="flex flex-wrap gap-1">
      {displayBadges.map((badge) => (
        <SellerBadge key={badge} badge={badge} size={size} showLabel={showLabel} />
      ))}
      {remaining > 0 && (
        <span className={`inline-flex items-center rounded-full bg-gray-100 text-gray-600 font-medium ${sizeClasses[size]}`}>
          +{remaining}
        </span>
      )}
    </div>
  )
}

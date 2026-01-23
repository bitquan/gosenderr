import { ReactNode } from 'react'
import { Card } from './Card'
import { cn } from '../lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: string
    trend: 'up' | 'down'
  }
  icon?: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'primary' | 'purple'
  suffix?: string
  className?: string
}

export function StatCard({
  title,
  value,
  change,
  icon,
  variant = 'default',
  suffix,
  className,
}: StatCardProps) {
  const variantStyles = {
    default: 'from-blue-50 to-blue-100',
    success: 'from-green-50 to-green-100',
    warning: 'from-orange-50 to-orange-100',
    primary: 'from-primary-50 to-primary-100',
    purple: 'from-purple-50 to-purple-100',
  }

  const iconColors = {
    default: 'text-blue-600',
    success: 'text-green-600',
    warning: 'text-orange-600',
    primary: 'text-primary-600',
    purple: 'text-purple-600',
  }

  const textColors = {
    default: 'text-blue-700',
    success: 'text-green-700',
    warning: 'text-orange-700',
    primary: 'text-primary-700',
    purple: 'text-purple-700',
  }

  return (
    <Card
      className={cn(
        'bg-gradient-to-br',
        variantStyles[variant],
        'border-none',
        className
      )}
      padding="md"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className={cn('text-3xl font-bold', textColors[variant])}>
              {value}
            </p>
            {suffix && <span className="text-lg text-gray-500">{suffix}</span>}
          </div>
          {change && (
            <div className="mt-2 flex items-center gap-1">
              <span
                className={cn(
                  'text-xs font-medium',
                  change.trend === 'up' ? 'text-green-600' : 'text-red-600'
                )}
              >
                {change.trend === 'up' ? '↑' : '↓'} {change.value}
              </span>
              <span className="text-xs text-gray-500">from last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className={cn('text-5xl opacity-20', iconColors[variant])}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

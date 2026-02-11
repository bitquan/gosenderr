import { HTMLAttributes, ReactNode } from 'react'
import { cn } from '../lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  variant?: 'default' | 'elevated' | 'gradient'
  hover?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({
  children,
  variant = 'default',
  hover = false,
  padding = 'md',
  className,
  ...props
}: CardProps) {
  const baseStyles =
    'rounded-lg border border-violet-200/70 bg-gradient-to-br from-violet-200/80 via-fuchsia-200/65 to-blue-200/70 text-slate-900 transition-all duration-300'

  const variantStyles = {
    default: 'shadow-lg shadow-violet-950/10',
    elevated: 'shadow-xl shadow-violet-950/15',
    gradient: 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-lg',
  }

  const hoverStyles = hover
    ? 'hover:shadow-lg hover:-translate-y-1 cursor-pointer'
    : ''

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  }

  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        hoverStyles,
        paddingStyles[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  action?: ReactNode
}

export function CardHeader({
  children,
  action,
  className,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn('flex items-center justify-between mb-4', className)}
      {...props}
    >
      <div className="flex-1">{children}</div>
      {action && <div className="ml-4">{action}</div>}
    </div>
  )
}

export function CardTitle({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn('text-lg font-semibold text-current', className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function CardContent({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-current', className)} {...props}>
      {children}
    </div>
  )
}

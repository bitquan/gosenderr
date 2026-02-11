import { ReactNode } from 'react'

interface Props {
  title?: string
  description?: string
  children?: ReactNode
  className?: string
}

export function MarketplaceDisabled({
  title = 'Senderrplace Disabled',
  description = 'This feature is temporarily unavailable.',
  children,
  className = '',
}: Props) {
  return (
    <div className={`min-h-screen bg-gray-50 flex items-center justify-center px-4 ${className}`}>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-gray-600 mb-4">{description}</p>
        {children}
      </div>
    </div>
  )
}

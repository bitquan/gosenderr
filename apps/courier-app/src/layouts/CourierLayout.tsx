import { ReactNode } from 'react'

interface CourierLayoutProps {
  children: ReactNode
}

export default function CourierLayout({ children }: CourierLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}

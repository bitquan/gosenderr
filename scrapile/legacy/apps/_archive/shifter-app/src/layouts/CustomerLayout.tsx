import { ReactNode } from 'react'
import { BottomNav, customerNavItems } from '../components/BottomNav'

interface CustomerLayoutProps {
  children: ReactNode
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="pb-24">
        {children}
      </div>
      <BottomNav items={customerNavItems} />
    </div>
  )
}

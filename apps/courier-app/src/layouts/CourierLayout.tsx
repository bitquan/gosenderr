import { ReactNode } from 'react'
import { BottomNav, courierNavItems } from '../components/BottomNav'

interface CourierLayoutProps {
  children: ReactNode
}

export default function CourierLayout({ children }: CourierLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="pb-24">
        {children}
      </div>
      <BottomNav items={courierNavItems} />
    </div>
  )
}

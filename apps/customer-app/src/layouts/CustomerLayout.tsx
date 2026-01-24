import { ReactNode } from 'react'
import { BottomNav, customerNavItems } from '../components/BottomNav'
import { RoleSwitcher } from '../components/ui/RoleSwitcher'

interface CustomerLayoutProps {
  children: ReactNode
}

export default function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      {/* Role Switcher - Fixed at top right */}
      <div className="fixed top-4 right-4 z-50">
        <RoleSwitcher />
      </div>
      
      <div className="pb-24">
        {children}
      </div>
      <BottomNav items={customerNavItems} />
    </div>
  )
}

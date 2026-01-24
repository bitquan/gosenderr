import { Outlet } from 'react-router-dom'
import { BottomNav, customerNavItems } from '../components/BottomNav'

export default function CustomerLayout() {
  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="pb-24">
        <Outlet />
      </div>
      <BottomNav items={customerNavItems} />
    </div>
  )
}

import { Outlet } from 'react-router-dom'
import { BottomNav, courierNavItems } from '../components/BottomNav'

export default function CourierLayout() {
  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="pb-24">
        <Outlet />
      </div>
      <BottomNav items={courierNavItems} />
    </div>
  )
}

import { Outlet } from 'react-router-dom'
import { BottomNav, courierNavItems } from '../components/BottomNav'
import { debugLogger } from '../utils/debugLogger'
import { useEffect } from 'react'

export default function CourierLayout() {
  debugLogger.log('render', 'CourierLayout render start')

  useEffect(() => {
    debugLogger.log('render', 'CourierLayout mounted with Outlet')
  }, [])
  
  return (
    <div className="min-h-screen bg-[#F8F9FF]">
      <div className="pb-24">
        <Outlet />
      </div>
      <BottomNav items={courierNavItems} />
    </div>
  )
}

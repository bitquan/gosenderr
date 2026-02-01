import { Outlet } from 'react-router-dom'
import { BottomNav, courierNavItems } from '../components/BottomNav'
import { debugLogger } from '../utils/debugLogger'
import { useEffect } from 'react'
import { useCourierLocationWriter } from '../hooks/v2/useCourierLocationWriter'

export default function CourierLayout() {
  debugLogger.log('render', 'CourierLayout render start')

  useCourierLocationWriter()

  useEffect(() => {
    debugLogger.log('render', 'CourierLayout mounted with Outlet')
  }, [])
  
  return (
    <>
      <main className="app-shell">
        <Outlet />
      </main>
      <BottomNav items={courierNavItems} />
    </>
  )
}

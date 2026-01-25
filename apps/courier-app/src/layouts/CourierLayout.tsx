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
    <>
      <Outlet />
      <BottomNav items={courierNavItems} />
    </>
  )
}

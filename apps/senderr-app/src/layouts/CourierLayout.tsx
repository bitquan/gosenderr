import { Outlet } from 'react-router-dom'
import { debugLogger } from '../utils/debugLogger'
import { useEffect } from 'react'
import { useCourierLocationWriter } from '../hooks/v2/useCourierLocationWriter'
import { useLocation } from 'react-router-dom'
import { CourierWebShell } from '@/components/layout/CourierWebShell'

export default function CourierLayout() {
  debugLogger.log('render', 'CourierLayout render start')
  const location = useLocation()

  useCourierLocationWriter()

  useEffect(() => {
    debugLogger.log('render', 'CourierLayout mounted with Outlet')
  }, [])

  if (location.pathname.startsWith('/navigation/active')) {
    return (
      <main className="app-shell">
        <Outlet />
      </main>
    )
  }
  
  return (
    <CourierWebShell>
      <main>
        <Outlet />
      </main>
    </CourierWebShell>
  )
}

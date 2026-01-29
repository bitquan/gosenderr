import { Outlet } from 'react-router-dom'
import { BottomNav, customerNavItems } from '../components/BottomNav'
import { Header } from '../components/layout/Header'
import { Footer } from '../components/layout/Footer'

export default function CustomerLayout() {
  return (
    <div className="min-h-screen bg-[#F8F9FF] flex flex-col">
      <Header />
      <div className="flex-1 pb-24">
        <Outlet />
      </div>
      <Footer />
      <BottomNav items={customerNavItems} />
    </div>
  )
}

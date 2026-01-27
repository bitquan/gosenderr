import { Routes, Route, Navigate } from 'react-router-dom'
import VendorDashboard from '@/pages/vendor/dashboard/page'
import VendorApply from '@/pages/vendor/apply/page'
import NewItemPage from '@/pages/items/new/page'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/vendor/dashboard" />} />
      <Route path="/vendor/dashboard" element={<VendorDashboard />} />
      <Route path="/vendor/apply" element={<VendorApply />} />
      <Route path="/vendor/items/new" element={<NewItemPage />} />
    </Routes>
  )
}

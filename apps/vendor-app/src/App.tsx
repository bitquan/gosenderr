import { Routes, Route, Navigate } from 'react-router-dom'
import VendorDashboard from '@/pages/vendor/dashboard/page'
import VendorApply from '@/pages/vendor/apply/page'
import NewItemPage from '@/pages/items/new/page'
import NavBar from '@/components/NavBar'
import ItemsListPage from '@/pages/items/list/page'
import EditItemPage from '@/pages/items/edit/page'

export default function App() {
  return (
    <>
      <NavBar />
      <Routes>
        <Route path="/" element={<Navigate to="/vendor/dashboard" />} />
        <Route path="/vendor/dashboard" element={<VendorDashboard />} />
        <Route path="/vendor/apply" element={<VendorApply />} />
        <Route path="/vendor/items" element={<ItemsListPage />} />
        <Route path="/vendor/items/new" element={<NewItemPage />} />
        <Route path="/vendor/items/:id/edit" element={<EditItemPage />} />
      </Routes>
    </>
  )
}

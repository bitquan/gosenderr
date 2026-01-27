import { Link } from 'react-router-dom';

export default function NavBar() {
  return (
    <nav className="bg-white border-b">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-6">
            <Link to="/vendor/dashboard" className="font-bold text-lg text-purple-600">Vendor Dashboard</Link>
            <Link to="/vendor/items" className="text-sm text-gray-600 hover:text-gray-900">Items</Link>
            <Link to="/vendor/apply" className="text-sm text-gray-600 hover:text-gray-900">Apply</Link>
            <Link to="/vendor/items/new" className="text-sm text-gray-600 hover:text-gray-900">+ New Item</Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

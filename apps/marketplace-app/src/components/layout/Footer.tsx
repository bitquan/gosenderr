import { Link } from 'react-router-dom'

/**
 * Footer - Site footer with links
 */
export function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">📦</div>
              <span className="text-lg font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                GoSenderR
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Your marketplace for buying and selling with integrated delivery
            </p>
          </div>

          {/* Marketplace */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Marketplace</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link to="/" className="hover:text-purple-600 transition-colors">
                  Browse Items
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-purple-600 transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/marketplace" className="hover:text-purple-600 transition-colors">
                  Sellers
                </Link>
              </li>
            </ul>
          </div>

          {/* For Sellers */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">For Sellers</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link to="/seller/apply" className="hover:text-purple-600 transition-colors">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link to="/seller/dashboard" className="hover:text-purple-600 transition-colors">
                  Seller Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Help</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>
                <Link to="/help" className="hover:text-purple-600 transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-purple-600 transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-purple-600 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-purple-600 transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            © {new Date().getFullYear()} GoSenderR. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

import { Link } from 'react-router-dom'

/**
 * Footer - Site footer with links
 */
export function Footer() {
  return (
    <footer className="bg-gradient-to-r from-blue-700 via-purple-700 to-purple-900 text-white border-t border-white/20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <div className="text-2xl">📦</div>
              <div>
                <div className="text-lg font-bold tracking-tight">
                  Senderrplace
                </div>
                <div className="text-xs uppercase tracking-widest text-white/60">by GoSenderr</div>
              </div>
            </div>
            <p className="text-sm text-white/60">
              Curated buys and sales backed by GoSenderr delivery
            </p>
          </div>

          {/* Senderrplace */}
          <div>
            <h3 className="font-semibold text-white mb-3">Senderrplace</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link to="/" className="hover:text-white transition-colors">
                  Browse Items
                </Link>
              </li>
              <li>
                <Link to="/categories" className="hover:text-white transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link to="/marketplace" className="hover:text-white transition-colors">
                  Sellers
                </Link>
              </li>
            </ul>
          </div>

          {/* For Sellers */}
          <div>
            <h3 className="font-semibold text-white mb-3">For Sellers</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link to="/seller/apply" className="hover:text-white transition-colors">
                  Become a Seller
                </Link>
              </li>
              <li>
                <Link to="/seller/dashboard" className="hover:text-white transition-colors">
                  Seller Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="font-semibold text-white mb-3">Help</h3>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <Link to="/help" className="hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-white transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/terms" className="hover:text-white transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-white/20">
          <p className="text-sm text-white/70 text-center">
            © {new Date().getFullYear()} Senderrplace by GoSenderr. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}

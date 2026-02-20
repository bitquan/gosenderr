import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useCart } from '../../contexts/CartContext'
import { signOut } from 'firebase/auth'
import { auth } from '../../lib/firebase/client'
import { getMarketplaceHeaderNav } from '../../lib/navigation/shellNav'

/**
 * Header - Role-aware navigation header
 */
export function Header() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const navItems = getMarketplaceHeaderNav(Boolean(user))
  
  // Safety check for cart context (handles HMR edge cases)
  let cart
  try {
    cart = useCart()
  } catch (e) {
    // Cart context not available yet, use defaults
    cart = { itemCount: 0, openCart: () => {} }
  }
  
  const { itemCount, openCart } = cart

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      navigate('/login')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <header className="bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 text-white shadow-lg border-b border-blue-300/30 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="text-2xl">📦</div>
            <span className="text-lg font-bold text-white sm:text-xl">
              Senderrplace
            </span>
            <span className="hidden lg:inline text-xs uppercase tracking-[0.5em] text-blue-100/70">
              by GoSenderr
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden xl:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link key={item.href} to={item.href} className="text-white/85 hover:text-white transition-colors">
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right side - Cart & Auth */}
          <div className="flex items-center space-x-4">
            {/* Shopping Cart */}
            <button
              onClick={openCart}
              className="relative p-2 text-white/90 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>

            {loading ? (
              <div className="w-8 h-8 rounded-full bg-white/30 animate-pulse" />
            ) : user ? (
              <>
                {/* User menu */}
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:block text-sm text-white/90">
                    {user.email}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 text-sm font-medium text-white rounded-lg bg-blue-900/45 border border-white/25 hover:bg-blue-900/65 transition-all"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-white/90 hover:text-white transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-sm font-medium text-blue-900 bg-white rounded-lg hover:bg-blue-50 transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

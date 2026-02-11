import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useRole } from '../../hooks/useRole'
import { useCart } from '../../contexts/CartContext'
import { signOut } from 'firebase/auth'
import { auth } from '../../lib/firebase/client'

/**
 * Header - Role-aware navigation header
 */
export function Header() {
  const { user, loading } = useAuth()
  const { roles, primaryRole } = useRole()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'customer':
        return 'bg-purple-100 text-purple-800'
      case 'seller':
        return 'bg-blue-100 text-blue-800'
      case 'courier':
        return 'bg-green-100 text-green-800'
      case 'admin':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="text-2xl">📦</div>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-500 bg-clip-text text-transparent">
              Senderrplace
            </span>
            <span className="text-xs uppercase tracking-[0.6em] text-purple-200">by GoSenderr</span>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/marketplace" className="text-gray-700 hover:text-purple-600 transition-colors">
              Browse
            </Link>
            <Link to="/food-pickups" className="text-gray-700 hover:text-purple-600 transition-colors">
              Food pickup
            </Link>
            {user && (
              <>
                <Link to="/marketplace/sell" className="text-gray-700 hover:text-purple-600 transition-colors">
                  Sell
                </Link>
                <Link to="/orders" className="text-gray-700 hover:text-purple-600 transition-colors">
                  Orders
                </Link>
                <Link to="/request-delivery" className="text-gray-700 hover:text-purple-600 transition-colors">
                  Ship
                </Link>
              </>
            )}
          </nav>

          {/* Right side - Cart & Auth */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu toggle */}
            {user && (
              <button
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 text-gray-700"
                aria-label="Open navigation"
              >
                ☰
              </button>
            )}
            {/* Shopping Cart */}
            <button
              onClick={openCart}
              className="relative p-2 text-gray-700 hover:text-purple-600 transition-colors"
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
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
            ) : user ? (
              <>
                {/* User menu */}
                <div className="flex items-center space-x-3">
                  <div className="hidden sm:block text-sm text-gray-700">
                    {user.email}
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
      {user && (
        <div className={`md:hidden px-4 pb-3 ${mobileMenuOpen ? 'block' : 'hidden'}`}>
          <div className="rounded-2xl bg-white shadow-lg border border-gray-100 p-3 space-y-2">
            <Link
              to="/marketplace"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full rounded-xl px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              Marketplace Items
            </Link>
            <Link
              to="/jobs/new"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full rounded-xl px-4 py-3 text-sm font-semibold text-green-700 hover:bg-green-50"
            >
              Custom Send
            </Link>
            <Link
              to="/request-delivery"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full rounded-xl px-4 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50"
            >
              Delivery Options
            </Link>
            <Link
              to="/food-pickups"
              onClick={() => setMobileMenuOpen(false)}
              className="block w-full rounded-xl px-4 py-3 text-sm font-semibold text-purple-700 hover:bg-purple-50"
            >
              Food pickups
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}

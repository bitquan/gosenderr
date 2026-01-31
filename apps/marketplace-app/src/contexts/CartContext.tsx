import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { MarketplaceItem } from '@gosenderr/shared'

export interface CartItem {
  item: MarketplaceItem
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: MarketplaceItem, quantity?: number) => void
  removeItem: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  getItemQuantity: (itemId: string) => number
  subtotal: number
  itemCount: number
  isOpen: boolean
  openCart: () => void
  closeCart: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

const CART_STORAGE_KEY = 'gosenderr_cart'

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isOpen, setIsOpen] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(CART_STORAGE_KEY)
    if (saved) {
      try {
        setItems(JSON.parse(saved))
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error)
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  }, [items])

  const addItem = (item: MarketplaceItem, quantity: number = 1) => {
    setItems((current) => {
      const existingIndex = current.findIndex((ci) => ci.item.id === item.id)
      
      if (existingIndex >= 0) {
        // Item already in cart, update quantity
        const updated = [...current]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + quantity,
        }
        return updated
      } else {
        // New item, add to cart
        return [...current, { item, quantity }]
      }
    })
    
    // Open cart sidebar when item is added
    setIsOpen(true)
  }

  const removeItem = (itemId: string) => {
    setItems((current) => current.filter((ci) => ci.item.id !== itemId))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId)
      return
    }

    setItems((current) =>
      current.map((ci) =>
        ci.item.id === itemId ? { ...ci, quantity } : ci
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const getItemQuantity = (itemId: string): number => {
    const cartItem = items.find((ci) => ci.item.id === itemId)
    return cartItem?.quantity || 0
  }

  const subtotal = items.reduce(
    (sum, ci) => sum + ci.item.price * ci.quantity,
    0
  )

  const itemCount = items.reduce((sum, ci) => sum + ci.quantity, 0)

  const openCart = () => setIsOpen(true)
  const closeCart = () => setIsOpen(false)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getItemQuantity,
        subtotal,
        itemCount,
        isOpen,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

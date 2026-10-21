import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getProduct } from '../lib/catalog'

const CartContext = createContext(null)
const STORAGE_KEY = 'gempack-cart'

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved) ? saved.filter((line) => getProduct(line.id)) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [lines, setLines] = useState(loadCart)
  const [lastOrder, setLastOrder] = useState(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines))
    } catch {
      // Storage can be unavailable (private mode); the cart still works in memory.
    }
  }, [lines])

  const value = useMemo(() => {
    const items = lines.map((l) => ({ ...getProduct(l.id), qty: l.qty }))
    const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
    const count = items.reduce((s, i) => s + i.qty, 0)
    const shipping = subtotal === 0 || subtotal >= 50 ? 0 : 4.99
    const tax = Math.round(subtotal * 0.0875 * 100) / 100

    const add = (id, qty = 1) =>
      setLines((prev) => {
        const stock = getProduct(id).stock
        const existing = prev.find((l) => l.id === id)
        if (existing) {
          return prev.map((l) => (l.id === id ? { ...l, qty: Math.min(stock, l.qty + qty) } : l))
        }
        return [...prev, { id, qty: Math.min(stock, qty) }]
      })
    const setQty = (id, qty) =>
      setLines((prev) =>
        qty <= 0
          ? prev.filter((l) => l.id !== id)
          : prev.map((l) => (l.id === id ? { ...l, qty: Math.min(getProduct(id).stock, qty) } : l)),
      )
    const remove = (id) => setLines((prev) => prev.filter((l) => l.id !== id))

    const checkout = (customer) => {
      const order = {
        number: `GP-${Date.now().toString(36).toUpperCase().slice(-6)}`,
        placedAt: new Date().toISOString(),
        customer,
        items,
        subtotal,
        shipping,
        tax,
        total: subtotal + shipping + tax,
      }
      setLastOrder(order)
      setLines([])
      return order
    }

    return { items, count, subtotal, shipping, tax, total: subtotal + shipping + tax, add, setQty, remove, checkout, lastOrder }
  }, [lines, lastOrder])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)

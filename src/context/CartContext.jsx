import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getProduct, DATA_VERSION } from '../lib/catalog'
import { useLedger } from './LedgerContext'

const CartContext = createContext(null)
// Keyed to the catalog version so saved ids never point at the wrong products
const STORAGE_KEY = `gempack-cart-${DATA_VERSION}`

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    return Array.isArray(saved) ? saved.filter((line) => line.item || getProduct(line.id)) : []
  } catch {
    return []
  }
}

// Lines are { id, qty } for catalog products, or { id, qty, item } for one-off items
// such as auction wins, which carry their own name and price.
const productFor = (line) => line.item ?? getProduct(line.id)

export function CartProvider({ children }) {
  const ledger = useLedger()
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
    const items = lines.map((l) => ({ ...productFor(l), qty: l.qty }))
    // Money is rounded to the cent so totals never show float noise like 24.779999999999998
    const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100
    const count = items.reduce((s, i) => s + i.qty, 0)
    const shipping = subtotal === 0 || subtotal >= 50 ? 0 : 4.99
    const tax = Math.round(subtotal * 0.0875 * 100) / 100
    const total = Math.round((subtotal + shipping + tax) * 100) / 100

    // One-off items carry their own stock; catalog products use live stock (minus units sold)
    const stockOf = (id, item) => (item ? item.stock : ledger.stockFor(id))
    const add = (id, qty = 1, item) =>
      setLines((prev) => {
        const stock = stockOf(id, item)
        const existing = prev.find((l) => l.id === id)
        if (existing) {
          return prev.map((l) => (l.id === id ? { ...l, qty: Math.min(stock, l.qty + qty) } : l))
        }
        return [...prev, { id, qty: Math.min(stock, qty), ...(item && { item }) }]
      })
    const setQty = (id, qty) =>
      setLines((prev) =>
        qty <= 0
          ? prev.filter((l) => l.id !== id)
          : prev.map((l) => (l.id === id ? { ...l, qty: Math.min(stockOf(l.id, l.item), qty) } : l)),
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
        total,
      }
      order.tx = ledger.record('order', {
        summary: `Order ${order.number}: ${count} item${count === 1 ? '' : 's'}`,
        amount: order.total,
        actor: customer.name,
        data: {
          orderNumber: order.number,
          customer,
          items: items.map(({ id, auctionId, name, type, source, seller, price, qty }) => ({ id, auctionId, name, type, source, seller, price, qty })),
          subtotal,
          shipping,
          tax,
          total: order.total,
        },
      })
      setLastOrder(order)
      setLines([])
      return order
    }

    return { items, count, subtotal, shipping, tax, total, add, setQty, remove, checkout, lastOrder }
  }, [lines, lastOrder, ledger])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)

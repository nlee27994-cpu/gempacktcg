import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { getProduct, productForVariant, DATA_VERSION, shopifyEnabled } from '../lib/catalog'
import { cartCreate, cartLinesAdd, cartLinesRemove, cartLinesUpdate, getCart } from '../lib/shopify'
import { useLedger } from './LedgerContext'

const CartContext = createContext(null)
// Keyed to the catalog version so saved ids never point at the wrong products
const STORAGE_KEY = `gempack-cart-${DATA_VERSION}`
const SHOPIFY_CART_KEY = 'gempack-shopify-cart'

const storage = {
  get(key) {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  },
  set(key, value) {
    try {
      if (value == null) localStorage.removeItem(key)
      else localStorage.setItem(key, value)
    } catch {
      // Storage can be unavailable (private mode); the cart still works in memory.
    }
  },
}

// Local lines are { id, qty } for catalog products in demo mode, or { id, qty, item } for one-off
// items such as auction wins and Vault listings, which carry their own name and price.
// With Shopify connected, catalog products live in the Shopify cart instead, and only one-off
// items stay local (they aren't Shopify products).
function loadLocal() {
  try {
    const saved = JSON.parse(storage.get(STORAGE_KEY))
    if (!Array.isArray(saved)) return []
    return saved.filter((line) => line.item || (!shopifyEnabled && getProduct(line.id)))
  } catch {
    return []
  }
}

const productFor = (line) => line.item ?? getProduct(line.id)

// A Shopify cart line as a cart item, using the catalog's product details where we have them
function shopifyItem(line) {
  const product = productForVariant(line.variantId)
  return {
    ...(product ?? { id: `shop-${line.handle}`, type: 'single', name: line.title, rarity: 'Common', source: 'Direct', seller: 'Gempack TCG' }),
    price: line.price,
    qty: line.qty,
    lineId: line.lineId,
    variantId: line.variantId,
  }
}

export function CartProvider({ children }) {
  const ledger = useLedger()
  const [lines, setLines] = useState(loadLocal)
  const [shopifyCart, setShopifyCart] = useState(null)
  const [busy, setBusy] = useState(false)
  // False until the saved Shopify cart has been fetched
  const [loaded, setLoaded] = useState(() => !shopifyEnabled || !storage.get(SHOPIFY_CART_KEY))
  const [notice, setNotice] = useState(null)
  const [lastOrder, setLastOrder] = useState(null)

  useEffect(() => storage.set(STORAGE_KEY, JSON.stringify(lines)), [lines])

  // Shopify cart calls run one at a time, so two quick clicks can't create two carts
  const queue = useRef(Promise.resolve())
  const cartRef = useRef(null)
  const run = useCallback((task) => {
    const next = queue.current.then(async () => {
      setBusy(true)
      try {
        const result = await task(cartRef.current)
        if (result) {
          cartRef.current = result.cart
          setShopifyCart(result.cart)
          storage.set(SHOPIFY_CART_KEY, result.cart?.id ?? null)
          setNotice(result.notice ?? null)
        }
        return { ok: true }
      } catch (err) {
        setNotice(err.message || 'Something went wrong with the cart. Please try again.')
        return { ok: false, error: err.message }
      } finally {
        setBusy(false)
      }
    })
    queue.current = next
    return next
  }, [])

  // Load the saved Shopify cart. Once it's been checked out Shopify stops returning it,
  // so the cart empties itself after a purchase. Re-check when the buyer comes back to the tab.
  useEffect(() => {
    if (!shopifyEnabled) return
    const refresh = () => {
      const id = cartRef.current?.id ?? storage.get(SHOPIFY_CART_KEY)
      if (!id) return
      run(async () => ({ cart: await getCart(id) })).then(() => setLoaded(true))
    }
    refresh()
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [run])

  const value = useMemo(() => {
    const shopifyItems = (shopifyCart?.lines ?? []).map(shopifyItem)
    const localItems = lines.map((l) => ({ ...productFor(l), qty: l.qty }))
    const items = [...shopifyItems, ...localItems]
    const isShopifyLine = (id) => shopifyItems.some((i) => i.id === id)

    // Money is rounded to the cent so totals never show float noise like 24.779999999999998
    const subtotal = Math.round(items.reduce((s, i) => s + i.price * i.qty, 0) * 100) / 100
    const count = items.reduce((s, i) => s + i.qty, 0)
    // Shopify works out shipping and tax at checkout; the demo checkout estimates them here
    const viaShopify = shopifyItems.length > 0
    const shipping = viaShopify ? null : subtotal === 0 || subtotal >= 50 ? 0 : 4.99
    const tax = viaShopify ? null : Math.round(subtotal * 0.0875 * 100) / 100
    const total = Math.round((subtotal + (shipping ?? 0) + (tax ?? 0)) * 100) / 100

    // One-off items carry their own stock; catalog products use live stock
    const stockOf = (id, item) => (item ? item.stock : ledger.stockFor(id))

    const add = (id, qty = 1, item) => {
      const product = !item && getProduct(id)
      if (shopifyEnabled && product) {
        if (!product.shopify) return Promise.resolve({ ok: false, error: 'This item is not for sale right now.' })
        return run(async (cart) => {
          const line = cart?.lines.find((l) => l.variantId === product.shopify.variantId)
          const quantity = Math.min(qty, stockOf(id) - (line?.qty ?? 0))
          if (quantity <= 0) return null
          const newLines = [{ merchandiseId: product.shopify.variantId, quantity }]
          return cart ? cartLinesAdd(cart.id, newLines) : cartCreate(newLines)
        })
      }
      setLines((prev) => {
        const stock = stockOf(id, item)
        const existing = prev.find((l) => l.id === id)
        if (existing) {
          return prev.map((l) => (l.id === id ? { ...l, qty: Math.min(stock, l.qty + qty) } : l))
        }
        return [...prev, { id, qty: Math.min(stock, qty), ...(item && { item }) }]
      })
      return Promise.resolve({ ok: true })
    }

    const remove = (id) => {
      if (isShopifyLine(id)) {
        const { variantId } = shopifyItems.find((i) => i.id === id)
        return run(async (cart) => {
          const line = cart?.lines.find((l) => l.variantId === variantId)
          return line ? cartLinesRemove(cart.id, [line.lineId]) : null
        })
      }
      setLines((prev) => prev.filter((l) => l.id !== id))
      return Promise.resolve({ ok: true })
    }

    const setQty = (id, qty) => {
      if (qty <= 0) return remove(id)
      if (isShopifyLine(id)) {
        const { variantId } = shopifyItems.find((i) => i.id === id)
        return run(async (cart) => {
          const line = cart?.lines.find((l) => l.variantId === variantId)
          return line ? cartLinesUpdate(cart.id, [{ id: line.lineId, quantity: Math.min(stockOf(id), qty) }]) : null
        })
      }
      setLines((prev) => prev.map((l) => (l.id === id ? { ...l, qty: Math.min(stockOf(l.id, l.item), qty) } : l)))
      return Promise.resolve({ ok: true })
    }

    // Shopify checkout: send the buyer to the cart's hosted checkout page, where they pay.
    const goToShopifyCheckout = () => {
      if (!shopifyCart?.checkoutUrl) return
      ledger.record('shopify-checkout', {
        summary: `Sent to Shopify checkout: ${shopifyItems.length} line${shopifyItems.length === 1 ? '' : 's'}`,
        amount: shopifyCart.subtotal,
        data: {
          cartId: shopifyCart.id,
          items: shopifyItems.map(({ id, name, price, qty }) => ({ id, name, price, qty })),
          subtotal: shopifyCart.subtotal,
        },
      })
      window.location.assign(shopifyCart.checkoutUrl)
    }

    // Demo checkout for local lines: nothing is charged, the order is only recorded in this browser
    const checkout = (customer) => {
      const order = {
        number: `GP-${Date.now().toString(36).toUpperCase().slice(-6)}`,
        placedAt: new Date().toISOString(),
        customer,
        items: localItems,
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
          items: localItems.map(({ id, auctionId, name, type, source, seller, price, qty }) => ({ id, auctionId, name, type, source, seller, price, qty })),
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

    return {
      items,
      shopifyItems,
      localItems,
      count,
      subtotal,
      shipping,
      tax,
      total,
      add,
      setQty,
      remove,
      checkout,
      goToShopifyCheckout,
      checkoutUrl: shopifyCart?.checkoutUrl ?? null,
      busy,
      loaded,
      notice,
      clearNotice: () => setNotice(null),
      lastOrder,
    }
  }, [lines, shopifyCart, busy, loaded, notice, lastOrder, ledger, run])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DATA_VERSION, getProduct, registerListing, unregisterListing } from '../lib/catalog'
import { formatPrice } from '../lib/format'
import { YOU, finalPrice, isEnded, leader, useAuctions } from './AuctionContext'
import { useLedger } from './LedgerContext'

// The Vault holds every card the visitor has pulled from a pack. From there a card can be
// listed on auction, listed in Singles at a fixed price, or shipped home.
// Saved in this browser; keyed to the catalog version like the cart.
const VaultContext = createContext(null)
const STORAGE_KEY = `gempack-vault-${DATA_VERSION}`

// status: 'vault' | 'auction' | 'single' | 'shipped' | 'sold'
const listingId = (item) => `ul-${item.id}`

// The shop listing for a card the visitor put up in Singles
function listingFor(item) {
  const card = getProduct(item.cardId)
  return {
    ...card,
    id: listingId(item),
    vaultId: item.id,
    condition: item.condition,
    price: item.listingPrice,
    source: 'Collector',
    seller: YOU,
    stock: 1,
    featured: false,
    priceSource: { label: 'Listed by you from your Vault', gempack: true },
  }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved && Array.isArray(saved.items)) {
      // Put the visitor's Singles listings back in the shop before anything renders
      saved.items.filter((i) => i.status === 'single').forEach((i) => registerListing(listingFor(i)))
      return saved
    }
  } catch {
    // fall through to an empty vault
  }
  return { items: [] }
}

export function VaultProvider({ children }) {
  const [state, setState] = useState(load)
  const { auctions, createListing } = useAuctions()
  const { record } = useLedger()
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage unavailable: the vault lasts until refresh.
    }
  }, [state])

  const update = (id, fn) => setState((s) => ({ ...s, items: s.items.map((i) => (i.id === id ? fn(i) : i)) }))

  // Follow cards on auction: sold ones leave the vault, unsold ones come back
  useEffect(() => {
    const now = Date.now()
    const changes = []
    for (const item of stateRef.current.items) {
      if (item.status !== 'auction') continue
      const a = auctions.find((x) => x.id === item.auctionId)
      if (!a) changes.push([item.id, { status: 'vault', auctionId: undefined }])
      else if (isEnded(a, now)) {
        changes.push([item.id, leader(a) ? { status: 'sold', soldFor: finalPrice(a), soldTo: leader(a) } : { status: 'vault', auctionId: undefined }])
      }
    }
    if (changes.length) {
      setState((s) => ({ ...s, items: s.items.map((i) => ({ ...i, ...(changes.find(([id]) => id === i.id)?.[1] ?? {}) })) }))
    }
  }, [auctions])

  const value = useMemo(() => {
    const find = (id) => stateRef.current.items.find((i) => i.id === id)

    return {
      items: state.items,
      inVault: state.items.filter((i) => i.status === 'vault'),

      // Every card from a rip goes straight into the vault
      addPulls: (cards, from) => {
        const stamp = Date.now()
        const added = cards.map((c, n) => ({
          id: `v${stamp.toString(36)}${n}${Math.random().toString(36).slice(2, 6)}`,
          cardId: c.id,
          condition: 'Near Mint',
          value: c.pulledValue,
          pulledAt: new Date(stamp).toISOString(),
          from,
          status: 'vault',
        }))
        setState((s) => ({ ...s, items: [...added, ...s.items] }))
      },

      listOnAuction: (id, { startPrice, buyNow, minutes }) => {
        const item = find(id)
        if (!item || item.status !== 'vault') return { error: 'This card is no longer in your vault.' }
        const result = createListing({ cardId: item.cardId, condition: item.condition, startPrice, buyNow, minutes })
        if (result.error) return result
        update(id, (i) => ({ ...i, status: 'auction', auctionId: result.id }))
        return result
      },

      listAsSingle: (id, price) => {
        const item = find(id)
        if (!item || item.status !== 'vault') return { error: 'This card is no longer in your vault.' }
        if (!(price >= 0.5)) return { error: 'The price must be at least $0.50.' }
        const listed = { ...item, status: 'single', listingPrice: Math.round(price * 100) / 100 }
        registerListing(listingFor(listed))
        update(id, () => listed)
        const name = getProduct(item.cardId).name
        record('vault-listed', {
          summary: `You listed ${name} in Singles for ${formatPrice(listed.listingPrice)}`,
          amount: listed.listingPrice,
          data: { vaultId: id, cardId: item.cardId, cardName: name, condition: item.condition, price: listed.listingPrice, productId: listingId(item) },
        })
        return { ok: true, productId: listingId(item) }
      },

      unlistSingle: (id) => {
        const item = find(id)
        if (!item || item.status !== 'single') return
        unregisterListing(listingId(item))
        update(id, (i) => ({ ...i, status: 'vault', listingPrice: undefined }))
      },

      ship: (id, address) => {
        const item = find(id)
        if (!item || item.status !== 'vault') return { error: 'This card is no longer in your vault.' }
        const tracking = `GP${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`
        update(id, (i) => ({ ...i, status: 'shipped', shippedAt: new Date().toISOString(), tracking, shipTo: address.city }))
        const name = getProduct(item.cardId).name
        record('vault-ship', {
          summary: `Shipping ${name} to ${address.name} (${address.city}), tracking ${tracking}`,
          actor: address.name,
          data: { vaultId: id, cardId: item.cardId, cardName: name, tracking, address },
        })
        return { ok: true, tracking }
      },

      listingIdFor: listingId,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, createListing, record])

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>
}

export const useVault = () => useContext(VaultContext)

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { DATA_VERSION, getProduct } from '../lib/catalog'

// The store's transaction ledger: every order, pack rip, bid and listing gets a unique
// transaction number and is kept with its full data, for the Dev Console (/admin).
// Saved in this browser only; a real store would write these to a database.
const LedgerContext = createContext(null)
const STORAGE_KEY = `gempack-ledger-${DATA_VERSION}`
const MAX_ENTRIES = 2000

export const TX_TYPES = {
  order: 'Order',
  'pack-rip': 'Pack rip (demo)',
  'drop-open': 'Drop pack opened',
  bid: 'Bid',
  'buy-now': 'Buy Now',
  'auction-ended': 'Auction ended',
  'listing-created': 'Listing created',
  'auction-claimed': 'Auction win claimed',
  'seller-verified': 'Seller verified',
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    if (saved && Array.isArray(saved.entries)) return saved
  } catch {
    // fall through to an empty ledger
  }
  return { seq: 0, entries: [] }
}

// TX-20261022-000042: the date plus a counter that never repeats, even after the ledger is cleared
const txNumber = (seq, date) => `TX-${date.toISOString().slice(0, 10).replaceAll('-', '')}-${String(seq).padStart(6, '0')}`

export function LedgerProvider({ children }) {
  const [state, setState] = useState(load)
  // The counter lives in a ref so record() can hand back the new number straight away
  const seqRef = useRef(state.seq)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage unavailable: the ledger lasts until refresh.
    }
  }, [state])

  const value = useMemo(() => {
    /**
     * Records a transaction and returns its number.
     * amount: the money value involved (order total, bid, sale price), or 0
     * actor: who did it ('@you', a rival bidder, 'Gempack TCG', a customer name)
     */
    const record = (type, { summary, amount = 0, actor = '@you', data = {} }) => {
      seqRef.current += 1
      const at = new Date()
      const entry = { tx: txNumber(seqRef.current, at), at: at.toISOString(), type, actor, summary, amount: Math.round(amount * 100) / 100, data }
      setState((s) => ({ seq: Math.max(s.seq, seqRef.current), entries: [entry, ...s.entries].slice(0, MAX_ENTRIES) }))
      return entry.tx
    }

    // Units sold per catalog product, from completed orders
    const sold = new Map()
    for (const e of state.entries) {
      if (e.type !== 'order') continue
      for (const item of e.data.items) {
        if (!item.auctionId) sold.set(item.id, (sold.get(item.id) ?? 0) + item.qty)
      }
    }

    return {
      entries: state.entries,
      record,
      sold,
      // Live stock: starting stock minus units sold
      stockFor: (id) => Math.max(0, (getProduct(id)?.stock ?? 0) - (sold.get(id) ?? 0)),
      clear: () => setState((s) => ({ seq: s.seq, entries: [] })),
    }
  }, [state])

  return <LedgerContext.Provider value={value}>{children}</LedgerContext.Provider>
}

export const useLedger = () => useContext(LedgerContext)

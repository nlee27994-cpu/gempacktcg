import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { auctions as listings, getProduct, DATA_VERSION } from '../lib/catalog'
import { CONDITION_VALUE, SELLER_FEE, minNextBid } from '../lib/auction'
import { formatPrice } from '../lib/format'
import { useCart } from './CartContext'
import { useLedger } from './LedgerContext'

// The Auction House runs entirely in the browser: listings come from src/data/auctions.json,
// rival bidders are simulated, and state is saved to localStorage so countdowns survive a refresh.
const AuctionContext = createContext(null)
// Keyed to the catalog version so saved ids never point at the wrong products
const STORAGE_KEY = `gempack-auctions-${DATA_VERSION}`
const MINUTE = 60 * 1000
export const YOU = '@you'
const RIVALS = ['@pullrate_pete', '@holo_hunter', '@sleevedup', '@binderbrooke', '@topdeck_tay', '@gradedgabe', '@cardboardcrack', '@nm_or_bust']

const round2 = (n) => Math.round(n * 100) / 100
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export const isEnded = (a, now) => Boolean(a.boughtBy) || now >= a.endsAt
export const leader = (a) => a.boughtBy ?? a.history[0]?.bidder ?? null
export const finalPrice = (a) => (a.boughtBy ? a.buyNow : a.currentBid)
export const auctionCard = (a) => ({ ...getProduct(a.cardId), condition: a.condition })

/** How an auction looks from the visitor's side, or null if they aren't involved */
export function viewerStatus(a, now) {
  const ended = isEnded(a, now)
  if (a.seller === YOU) return ended ? (leader(a) ? 'Sold' : 'Unsold') : 'Your listing'
  const involved = a.boughtBy === YOU || a.history.some((h) => h.bidder === YOU)
  if (ended) return leader(a) === YOU ? 'Won' : involved ? 'Lost' : 'Ended'
  if (!involved) return null
  return leader(a) === YOU ? 'Winning' : 'Outbid'
}

// Turns the generated listings into live auctions, with end times counted from now
function seed(now = Date.now()) {
  return {
    auctions: listings.map(({ endsInMinutes, history, ...a }) => ({
      ...a,
      endsAt: now + endsInMinutes * MINUTE,
      history: history.map(({ minutesAgo, ...h }) => ({ ...h, at: now - minutesAgo * MINUTE })),
    })),
    user: { handle: YOU, verified: false },
    notified: {},
    paid: {},
    logged: {}, // auctions whose ending is already in the ledger
  }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    // Start a fresh auction house once every listing has run out, so the demo never looks dead
    if (saved?.auctions?.some((a) => a.seller !== YOU && !isEnded(a, Date.now()))) return saved
    if (saved?.user) return { ...seed(), user: saved.user }
  } catch {
    // fall through to a fresh seed
  }
  return seed()
}

export function AuctionProvider({ children }) {
  const [state, setState] = useState(load)
  const [notices, setNotices] = useState([])
  const stateRef = useRef(state)
  stateRef.current = state
  const cart = useCart()
  const ledger = useLedger()
  // Intervals and timeouts outlive renders, so they reach the ledger through a ref
  const ledgerRef = useRef(ledger)
  ledgerRef.current = ledger
  const cardName = (a) => getProduct(a.cardId).name

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Storage unavailable: the auction house still works until refresh.
    }
  }, [state])

  const notify = (text, href) =>
    setNotices((n) => [...n, { id: `${Date.now()}-${Math.random()}`, text, href }].slice(-4))

  const find = (id) => stateRef.current.auctions.find((a) => a.id === id)
  const update = (id, fn) => setState((s) => ({ ...s, auctions: s.auctions.map((a) => (a.id === id ? fn(a) : a)) }))
  const applyBid = (id, bidder, amount) => {
    const a = find(id)
    update(id, (x) => ({
      ...x,
      currentBid: amount,
      bidCount: x.bidCount + 1,
      history: [{ bidder, amount, at: Date.now() }, ...x.history],
    }))
    ledgerRef.current.record('bid', {
      summary: `${bidder === YOU ? 'You' : bidder} bid ${formatPrice(amount)} on ${cardName(a)}`,
      amount,
      actor: bidder,
      data: { auctionId: id, cardId: a.cardId, cardName: cardName(a), amount, previousLeader: leader(a), bidNumber: a.bidCount + 1 },
    })
  }

  // A rival raises by one increment, but never past Buy Now or roughly what the card is worth
  const rivalBid = (id) => {
    const a = find(id)
    if (!a || isEnded(a, Date.now())) return
    const amount = minNextBid(a)
    if ((a.buyNow && amount >= a.buyNow) || amount > a.botCeiling) return
    const previous = leader(a)
    applyBid(id, pick(RIVALS.filter((r) => r !== previous && r !== a.seller)), amount)
    if (previous === YOU) notify(`You've been outbid on ${getProduct(a.cardId).name}. It's now ${formatPrice(amount)}.`, `/auctions/${id}`)
  }
  const rivalBidRef = useRef(rivalBid)
  rivalBidRef.current = rivalBid
  const notifyRef = useRef(notify)

  // Background activity: every few seconds a rival may bid somewhere, favouring
  // auctions that end soon and the visitor's own listings
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() > 0.5) return
      const now = Date.now()
      const live = stateRef.current.auctions.filter((a) => !isEnded(a, now))
      if (!live.length) return
      const weights = live.map((a) => (a.seller === YOU ? 4 : 1) * (a.endsAt - now < 15 * MINUTE ? 3 : 1))
      let r = Math.random() * weights.reduce((s, w) => s + w, 0)
      const chosen = live.find((_, i) => (r -= weights[i]) < 0) ?? live[0]
      rivalBidRef.current(chosen.id)
    }, 7000)
    return () => clearInterval(t)
  }, [])

  // Tell the visitor once when an auction they won or listed has finished,
  // and write every finished auction to the ledger once
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now()
      const s = stateRef.current
      const unlogged = s.auctions.filter((a) => isEnded(a, now) && !s.logged?.[a.id])
      if (unlogged.length) {
        setState((st) => ({ ...st, logged: { ...st.logged, ...Object.fromEntries(unlogged.map((a) => [a.id, true])) } }))
        for (const a of unlogged) {
          const winner = leader(a)
          const price = winner ? finalPrice(a) : 0
          ledgerRef.current.record('auction-ended', {
            summary: winner ? `${cardName(a)} sold to ${winner === YOU ? 'you' : winner} for ${formatPrice(price)}` : `${cardName(a)} ended with no bids`,
            amount: price,
            actor: a.seller,
            data: {
              auctionId: a.id,
              cardId: a.cardId,
              cardName: cardName(a),
              condition: a.condition,
              seller: a.seller,
              sellerType: a.sellerType,
              winner,
              finalPrice: price,
              boughtNow: Boolean(a.boughtBy),
              bidCount: a.bidCount,
              // Gempack keeps the whole price on its own listings and a fee on collectors' sales
              gempackRevenue: winner ? Math.round((a.sellerType === 'Official' ? price : price * SELLER_FEE) * 100) / 100 : 0,
              endedAt: new Date(Math.min(a.endsAt, now)).toISOString(),
            },
          })
        }
      }
      const done = s.auctions.filter((a) => isEnded(a, now) && !s.notified[a.id] && (leader(a) === YOU || a.seller === YOU))
      if (!done.length) return
      setState((st) => ({ ...st, notified: { ...st.notified, ...Object.fromEntries(done.map((a) => [a.id, true])) } }))
      for (const a of done) {
        const name = getProduct(a.cardId).name
        const href = `/auctions/${a.id}`
        if (a.seller !== YOU) notifyRef.current(`${a.boughtBy ? 'You bought' : 'You won'} ${name} for ${formatPrice(finalPrice(a))}. Pay now to claim it.`, href)
        else if (leader(a)) notifyRef.current(`Your ${name} sold for ${formatPrice(finalPrice(a))}. You get ${formatPrice(finalPrice(a) * (1 - SELLER_FEE))} after the fee.`, href)
        else notifyRef.current(`Your ${name} listing ended with no bids.`, href)
      }
    }, 1000)
    return () => clearInterval(t)
  }, [])

  // Auction wins that went through checkout count as paid
  useEffect(() => {
    const won = cart.lastOrder?.items.filter((i) => i.id.startsWith('auction-')) ?? []
    if (won.length) {
      setState((s) => ({ ...s, paid: { ...s.paid, ...Object.fromEntries(won.map((i) => [i.auctionId, true])) } }))
    }
  }, [cart.lastOrder])

  const value = useMemo(() => {
    const buyNow = (id) => {
      const a = find(id)
      if (!a || isEnded(a, Date.now()) || !a.buyNow) return { error: 'This auction has ended.' }
      if (a.seller === YOU) return { error: "You can't buy your own listing." }
      update(id, (x) => ({ ...x, boughtBy: YOU, currentBid: x.buyNow, endsAt: Date.now() }))
      ledger.record('buy-now', {
        summary: `You bought ${cardName(a)} at Buy Now for ${formatPrice(a.buyNow)}`,
        amount: a.buyNow,
        data: { auctionId: id, cardId: a.cardId, cardName: cardName(a), buyNow: a.buyNow, seller: a.seller, bidsBefore: a.bidCount },
      })
      return { ok: true }
    }

    const placeBid = (id, amount) => {
      const a = find(id)
      if (!a || isEnded(a, Date.now())) return { error: 'This auction has ended.' }
      if (a.seller === YOU) return { error: "You can't bid on your own listing." }
      if (leader(a) === YOU) return { error: "You're already the highest bidder." }
      const min = minNextBid(a)
      if (!(amount >= min)) return { error: `The minimum bid is ${formatPrice(min)}.` }
      if (a.buyNow && amount >= a.buyNow) return buyNow(id)
      applyBid(id, YOU, round2(amount))
      // Rivals often answer a bid within a few seconds
      if (Math.random() < 0.55) setTimeout(() => rivalBidRef.current(id), 4000 + Math.random() * 6000)
      return { ok: true }
    }

    const createListing = ({ cardId, condition, startPrice, buyNow: buyNowPrice, minutes }) => {
      if (!stateRef.current.user.verified) return { error: 'Only verified sellers can list cards.' }
      const card = getProduct(cardId)
      const worth = card.marketPrice * CONDITION_VALUE[condition]
      const id = `au-you-${Date.now()}`
      const listing = {
        id,
        cardId,
        condition,
        seller: YOU,
        sellerType: 'Verified',
        startPrice: round2(startPrice),
        buyNow: buyNowPrice ? round2(buyNowPrice) : null,
        currentBid: 0,
        bidCount: 0,
        endsAt: Date.now() + minutes * MINUTE,
        botCeiling: round2(worth * (0.85 + Math.random() * 0.3)),
        history: [],
      }
      setState((s) => ({ ...s, auctions: [listing, ...s.auctions] }))
      ledger.record('listing-created', {
        summary: `You listed ${card.name} (${condition}) from ${formatPrice(listing.startPrice)}`,
        amount: listing.startPrice,
        data: { auctionId: id, cardId, cardName: card.name, condition, startPrice: listing.startPrice, buyNow: listing.buyNow, minutes, endsAt: new Date(listing.endsAt).toISOString() },
      })
      setTimeout(() => rivalBidRef.current(id), 5000 + Math.random() * 7000)
      return { ok: true, id }
    }

    const claim = (id) => {
      const a = find(id)
      const card = auctionCard(a)
      ledger.record('auction-claimed', {
        summary: `Added won ${card.name} to cart at ${formatPrice(finalPrice(a))}`,
        amount: finalPrice(a),
        data: { auctionId: id, cardId: a.cardId, cardName: card.name, price: finalPrice(a), seller: a.seller },
      })
      cart.add(`auction-${id}`, 1, {
        ...card,
        id: `auction-${id}`,
        auctionId: id,
        price: finalPrice(a),
        source: 'Auction',
        seller: a.seller,
        stock: 1,
        href: `/auctions/${id}`,
      })
    }

    return {
      auctions: state.auctions,
      user: state.user,
      paid: state.paid,
      notices,
      dismiss: (id) => setNotices((n) => n.filter((x) => x.id !== id)),
      placeBid,
      buyNow,
      createListing,
      claim,
      verify: (details) => {
        setState((s) => ({ ...s, user: { ...s.user, ...details, verified: true } }))
        ledger.record('seller-verified', {
          summary: `${details.name} verified as a seller`,
          actor: details.name,
          data: { name: details.name, email: details.email, idCheck: 'submitted (demo)', agreedToAuthentication: true },
        })
      },
      reset: () => {
        setState((s) => ({ ...seed(), user: s.user }))
        setNotices([])
      },
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, notices, cart, ledger])

  return <AuctionContext.Provider value={value}>{children}</AuctionContext.Provider>
}

export const useAuctions = () => useContext(AuctionContext)

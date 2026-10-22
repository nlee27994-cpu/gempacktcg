import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import AuctionStatus from '../components/AuctionStatus'
import CardArt from '../components/CardArt'
import RarityBadge from '../components/RarityBadge'
import SellerBadge from '../components/SellerBadge'
import { YOU, auctionCard, finalPrice, isEnded, leader, useAuctions, viewerStatus } from '../context/AuctionContext'
import { useCart } from '../context/CartContext'
import { SELLER_FEE, bidIncrement, formatCountdown, minNextBid } from '../lib/auction'
import { formatPrice } from '../lib/format'
import useNow from '../lib/useNow'
import NotFound from './NotFound'

const timeAgo = (at, now) => {
  const m = Math.max(0, Math.round((now - at) / 60000))
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

function BidPanel({ auction }) {
  const { placeBid, buyNow } = useAuctions()
  const min = minNextBid(auction)
  const step = bidIncrement(min)
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState(null)
  const leading = leader(auction) === YOU
  // Quick bids, capped below Buy Now (a bid at or above it just buys the card)
  const quick = [min, min + step * 2, min + step * 5]
    .map((v) => Math.round(v * 100) / 100)
    .filter((v, i, arr) => (!auction.buyNow || v < auction.buyNow) && arr.indexOf(v) === i)

  const bid = (value) => {
    const result = placeBid(auction.id, value)
    setMessage(result.error ? { error: result.error } : { ok: `Bid placed: ${formatPrice(value)}` })
    if (!result.error) setAmount('')
  }

  return (
    <div className="panel space-y-4 p-5">
      {leading ? (
        <p className="rounded-lg bg-emerald-gem/10 p-3 text-sm font-semibold text-emerald-300">
          You're the highest bidder. We'll let you know if someone outbids you.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-400">
            Minimum bid <span className="font-semibold text-white">{formatPrice(min)}</span> · raises go up in steps of {formatPrice(step)} at this price
          </p>
          <div className="flex flex-wrap gap-2">
            {quick.map((v) => (
              <button key={v} className="btn-ghost flex-1 px-3" onClick={() => bid(v)}>
                Bid {formatPrice(v)}
              </button>
            ))}
          </div>
          <form
            noValidate
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              bid(parseFloat(amount))
            }}
          >
            <input
              className="input"
              type="number"
              step="0.01"
              min={min}
              inputMode="decimal"
              placeholder={`${min.toFixed(2)} or more`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Your bid"
            />
            <button type="submit" className="btn-primary shrink-0">Place bid</button>
          </form>
        </>
      )}
      {auction.buyNow && (
        <button
          className="btn-gold w-full py-3"
          onClick={() => {
            const result = buyNow(auction.id)
            if (result.error) setMessage({ error: result.error })
          }}
        >
          Buy Now · {formatPrice(auction.buyNow)}
        </button>
      )}
      {message && <p className={`text-sm ${message.error ? 'text-rose-400' : 'text-emerald-300'}`}>{message.error ?? message.ok}</p>}
    </div>
  )
}

function Outcome({ auction, status }) {
  const { claim, paid } = useAuctions()
  const { items } = useCart()
  const price = finalPrice(auction)
  const inCart = items.some((i) => i.id === `auction-${auction.id}`)

  if (status === 'Won') {
    return (
      <div className="panel space-y-3 border-gold-400/50 p-5">
        <p className="text-lg font-bold text-gold-300">🏆 You won this auction for {formatPrice(price)}</p>
        {paid[auction.id] ? (
          <p className="text-sm text-emerald-300">Paid. It ships after Gempack authenticates it.</p>
        ) : inCart ? (
          <Link to="/cart" className="btn-primary w-full py-3">In your cart: go to checkout</Link>
        ) : (
          <button className="btn-primary w-full py-3" onClick={() => claim(auction.id)}>Pay now · add to cart</button>
        )}
      </div>
    )
  }
  if (auction.seller === YOU) {
    return (
      <div className="panel p-5 text-sm">
        {leader(auction) ? (
          <p>
            Sold to <span className="font-semibold">{leader(auction)}</span> for {formatPrice(price)}. You get{' '}
            <span className="font-semibold text-emerald-300">{formatPrice(price * (1 - SELLER_FEE))}</span> after the {SELLER_FEE * 100}% fee, once
            the card passes authentication.
          </p>
        ) : (
          <p className="text-slate-400">This listing ended with no bids. Try again with a lower starting price.</p>
        )}
      </div>
    )
  }
  return (
    <div className="panel p-5 text-sm text-slate-300">
      {leader(auction) ? `Sold to ${leader(auction)} for ${formatPrice(price)}.` : 'This auction ended with no bids.'}
    </div>
  )
}

export default function AuctionDetail() {
  const { id } = useParams()
  const { auctions } = useAuctions()
  const now = useNow()
  const auction = auctions.find((a) => a.id === id)
  if (!auction) return <NotFound />

  const card = auctionCard(auction)
  const ended = isEnded(auction, now)
  const status = viewerStatus(auction, now)
  const left = auction.endsAt - now
  const urgent = !ended && left < 5 * 60 * 1000

  return (
    <div className="container-page py-8">
      <nav className="mb-6 text-sm text-slate-400">
        <Link to="/auctions" className="hover:text-white">Auction House</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-200">{card.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="mx-auto w-full max-w-sm">
          <CardArt product={card} size="lg" />
        </div>

        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <RarityBadge rarity={card.rarity} />
              <span className="rounded-full bg-navy-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">{card.game}</span>
              <AuctionStatus status={status} />
            </div>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{card.name}</h1>
            <p className="mt-1 text-slate-400">
              {card.set} · #{card.number} · {card.condition}
            </p>
            <div className="mt-2">
              <SellerBadge seller={auction.seller} type={auction.sellerType} you={auction.seller === YOU} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="panel p-3">
              <p className="text-[11px] text-slate-400">{ended ? 'Final price' : auction.bidCount ? 'Current bid' : 'Starting price'}</p>
              <p className="font-display text-xl font-bold">
                {formatPrice(ended ? finalPrice(auction) : auction.bidCount ? auction.currentBid : auction.startPrice)}
              </p>
            </div>
            <div className="panel p-3">
              <p className="text-[11px] text-slate-400">Bids</p>
              <p className="font-display text-xl font-bold">{auction.bidCount}</p>
            </div>
            <div className={`panel p-3 ${urgent ? 'border-rose-400/60' : ''}`}>
              <p className="text-[11px] text-slate-400">{ended ? 'Status' : 'Time left'}</p>
              <p className={`font-display text-xl font-bold tabular-nums ${urgent ? 'text-rose-400' : ''}`}>
                {ended ? 'Ended' : formatCountdown(left)}
              </p>
            </div>
          </div>

          {ended ? (
            <Outcome auction={auction} status={status} />
          ) : auction.seller === YOU ? (
            <p className="panel p-5 text-sm text-slate-300">
              This is your listing. Rival bidders are already looking at it. You'll get a notice when it ends.
            </p>
          ) : (
            <BidPanel auction={auction} />
          )}

          <p className="text-xs text-slate-500">
            Market value (near-mint, raw): {formatPrice(card.marketPrice)} ·{' '}
            <Link to={`/product/${card.id}`} className="text-emerald-300 hover:underline">
              see the fixed-price listing in the shop
            </Link>
            . {auction.sellerType === 'Verified' && 'Cards from collectors ship to Gempack for authentication before they reach the winner.'}
          </p>

          <div>
            <h2 className="mb-2 text-lg font-semibold">Bid history</h2>
            {auction.history.length === 0 && !auction.boughtBy ? (
              <p className="panel p-4 text-sm text-slate-400">No bids yet.</p>
            ) : (
              <ul className="panel divide-y divide-navy-700 text-sm">
                {auction.boughtBy && (
                  <li className="flex justify-between px-4 py-2.5">
                    <span className="font-semibold text-gold-300">{auction.boughtBy === YOU ? 'You' : auction.boughtBy} · Buy Now</span>
                    <span className="font-semibold">{formatPrice(auction.buyNow)}</span>
                  </li>
                )}
                {auction.history.map((h, i) => (
                  <li key={`${h.at}-${i}`} className="flex justify-between gap-3 px-4 py-2.5">
                    <span className={h.bidder === YOU ? 'font-semibold text-emerald-300' : 'text-slate-300'}>
                      {h.bidder === YOU ? 'You' : h.bidder}
                      <span className="ml-2 text-xs text-slate-500">{timeAgo(h.at, now)}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatPrice(h.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

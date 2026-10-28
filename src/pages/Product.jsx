import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CardArt from '../components/CardArt'
import ProductCard from '../components/ProductCard'
import RarityBadge from '../components/RarityBadge'
import PriceSource from '../components/PriceSource'
import SeriesChecklist from '../components/SeriesChecklist'
import SourceBadge from '../components/SourceBadge'
import { useCart } from '../context/CartContext'
import { useSeries } from '../context/SeriesContext'
import { useLedger } from '../context/LedgerContext'
import { isEnded, useAuctions } from '../context/AuctionContext'
import { getProduct, relatedProducts } from '../lib/catalog'
import { formatPrice } from '../lib/format'
import { oddsFor } from '../lib/packOpening'
import { RARITY_STYLES } from '../lib/rarity'
import { getSeries } from '../lib/series'
import NotFound from './NotFound'

const SOURCE_COPY = {
  Direct: 'Sold and shipped by Gempack TCG. Stored sleeved, shipped in a top-loader.',
  Vendor: 'Listed by a verified partner store and checked by Gempack before it ships.',
  Collector: 'Listed at a fixed price by a verified collector. The card ships to Gempack for authentication first.',
}

const formatOdds = (p) => {
  const pct = p * 100
  if (pct >= 10) return `${Math.round(pct)}%`
  if (pct >= 1) return `${pct.toFixed(1)}%`
  return `1 in ${Math.round(1 / p)}`
}

function OddsTable({ pack }) {
  const { filler, hit, expectedValue } = oddsFor(pack)
  const Column = ({ title, rows }) => (
    <div>
      <p className="label">{title}</p>
      <ul className="space-y-1.5">
        {rows.map(([r, p]) => (
          <li key={r} className="flex items-center gap-2 text-sm">
            <span className={`h-2 w-2 rotate-45 ${RARITY_STYLES[r].dot}`} />
            <span className="flex-1 text-slate-300">{r}</span>
            <span className="font-semibold tabular-nums">{formatOdds(p)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
  return (
    <div className="panel p-5">
      <div className="grid gap-6 sm:grid-cols-2">
        <Column title={`Hit slot${pack.hitSlots > 1 ? `s (×${pack.hitSlots})` : ''}`} rows={hit} />
        <Column title="Other slots" rows={filler} />
      </div>
      <p className="mt-5 border-t border-navy-700 pt-4 text-xs text-slate-400">
        Average pull value: <span className="font-semibold text-slate-200">{formatPrice(expectedValue)}</span>. Most packs land below
        the average and a few chase pulls land far above it.
      </p>
    </div>
  )
}

function LiveAuctions({ cardId, auctions }) {
  const now = Date.now()
  const live = auctions.filter((a) => a.cardId === cardId && !isEnded(a, now))
  if (!live.length) return null
  const lowest = Math.min(...live.map((a) => (a.bidCount ? a.currentBid : a.startPrice)))
  return (
    <Link to={`/auctions/${live[0].id}`} className="mt-6 flex items-center justify-between rounded-xl border border-gold-400/40 bg-gold-400/5 p-4 text-sm hover:bg-gold-400/10">
      <span>
        ⚖ <span className="font-semibold">{live.length === 1 ? '1 live auction' : `${live.length} live auctions`}</span> for this card, bids from{' '}
        {formatPrice(lowest)}
      </span>
      <span className="font-semibold text-gold-300">Bid →</span>
    </Link>
  )
}

// Keyed on id so quantity / "added" state resets when moving between products
export default function Product() {
  const { id } = useParams()
  return <ProductDetail key={id} id={id} />
}

function ProductDetail({ id }) {
  const product = getProduct(id)
  const { add, items } = useCart()
  const { openedFor } = useSeries()
  const { auctions } = useAuctions()
  const { stockFor } = useLedger()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)

  if (!product) return <NotFound />

  const isPack = product.type === 'pack'
  const inCart = items.find((i) => i.id === product.id)?.qty ?? 0
  // Series drops sell down as packs are opened
  const series = product.seriesId && getSeries(product.seriesId)
  const stock = series ? series.packs.length - openedFor(series.id).length : stockFor(product.id)
  const maxQty = stock - inCart

  const handleAdd = () => {
    add(product.id, qty)
    setAdded(true)
    setQty(1)
    setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div className="container-page py-8">
      <nav className="mb-6 text-sm text-slate-400">
        <Link to="/shop" className="hover:text-white">Shop</Link>
        <span className="mx-2">/</span>
        <Link to={`/shop?type=${product.type}`} className="hover:text-white">{isPack ? 'Packs' : 'Singles'}</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-200">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="perspective mx-auto w-full max-w-sm">
          <CardArt product={product} size="lg" />
        </div>

        <div>
          <div className="flex flex-wrap gap-2">
            <RarityBadge rarity={product.rarity} prefix={isPack ? 'Guaranteed hit: ' : ''} />
            <SourceBadge source={product.source} />
            <span className="rounded-full bg-navy-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">{product.game}</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{product.name}</h1>
          <p className="mt-1 text-slate-400">
            {product.set}
            {!isPack && ` · #${product.number}`} · {product.condition}
          </p>

          <div className="mt-6 flex items-end gap-4">
            <p className="font-display text-4xl font-bold">{formatPrice(product.price)}</p>
            {!isPack && (
              <p className="pb-1 text-sm text-slate-400">
                Market (NM raw): <span className="text-slate-200">{formatPrice(product.marketPrice)}</span>
              </p>
            )}
          </div>

          <PriceSource source={product.priceSource} />

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-navy-500 bg-navy-900">
              <button className="px-3 py-2.5 text-lg disabled:opacity-40" onClick={() => setQty((q) => q - 1)} disabled={qty <= 1} aria-label="Decrease quantity">−</button>
              <span className="w-8 text-center font-semibold tabular-nums" aria-live="polite">{qty}</span>
              <button className="px-3 py-2.5 text-lg disabled:opacity-40" onClick={() => setQty((q) => q + 1)} disabled={qty >= maxQty} aria-label="Increase quantity">+</button>
            </div>
            <button className="btn-primary flex-1 py-3 sm:flex-none sm:px-8" onClick={handleAdd} disabled={maxQty <= 0}>
              {added ? '✓ Added to cart' : stock <= 0 ? 'Sold out' : maxQty <= 0 ? 'All in your cart' : 'Add to cart'}
            </button>
            {isPack && stock > 0 && (
              <Link to={`/open/${product.id}`} className="btn-gold flex-1 py-3 sm:flex-none">
                ⚡ Demo rip
              </Link>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {series ? `${stock} of ${series.packs.length} packs left in this drop` : `${stock} in stock`}
            {inCart > 0 && ` · ${inCart} in your cart`}
          </p>

          <dl className="panel mt-6 divide-y divide-navy-700 text-sm">
            {[
              ['Seller', product.seller],
              ['Fulfilment', SOURCE_COPY[product.source]],
              ...(isPack
                ? [
                    ['Cards per pack', product.cardsPerPack],
                    ['Hit slots', `${product.hitSlots} × ${product.rarity} or better`],
                    ...(series ? [['Print run', `${series.packs.length} packs, ${series.checklist.length} different cards`]] : []),
                  ]
                : [
                    ['Condition', product.condition],
                    ['Card number', `#${product.number}`],
                    ...(product.officialRarity ? [['Official rarity', product.officialRarity]] : []),
                  ]),
            ].map(([k, v]) => (
              <div key={k} className="grid grid-cols-[120px_1fr] gap-3 px-4 py-3">
                <dt className="text-slate-400">{k}</dt>
                <dd className="text-slate-200">{v}</dd>
              </div>
            ))}
          </dl>

          {!isPack && <LiveAuctions cardId={product.id} auctions={auctions} />}

          {isPack && !series && (
            <div className="mt-6">
              <h2 className="mb-3 text-lg font-semibold">Pull odds</h2>
              <OddsTable pack={product} />
            </div>
          )}
          {series && (
            <a href="#checklist" className="btn-ghost mt-6 w-full">
              See all {series.checklist.length} cards in this drop ↓
            </a>
          )}
        </div>
      </div>

      {series && (
        <div id="checklist" className="mt-12 scroll-mt-24">
          <SeriesChecklist pack={product} series={series} />
        </div>
      )}

      <section className="mt-16">
        <h2 className="mb-4 text-2xl font-bold">More {product.game} {isPack ? 'packs' : 'singles'}</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {relatedProducts(product).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import CardArt from '../components/CardArt'
import RarityBadge from '../components/RarityBadge'
import { useAuctions } from '../context/AuctionContext'
import { useVault } from '../context/VaultContext'
import { DURATIONS, SELLER_FEE } from '../lib/auction'
import { getProduct } from '../lib/catalog'
import { formatPrice } from '../lib/format'
import { rarityRank } from '../lib/rarity'

const FILTERS = [
  ['all', 'All'],
  ['vault', 'In vault'],
  ['listed', 'Listed'],
  ['gone', 'Shipped & sold'],
]
const STATUS = {
  vault: ['In vault', 'bg-emerald-gem/15 text-emerald-300'],
  auction: ['On auction', 'bg-gold-400/15 text-gold-300'],
  single: ['In Singles', 'bg-sky-400/15 text-sky-300'],
  shipped: ['Shipped', 'bg-navy-700 text-slate-300'],
  sold: ['Sold', 'bg-amethyst-500/15 text-amethyst-300'],
}
const matches = (filter, status) =>
  filter === 'all' ||
  (filter === 'vault' && status === 'vault') ||
  (filter === 'listed' && (status === 'auction' || status === 'single')) ||
  (filter === 'gone' && (status === 'shipped' || status === 'sold'))

function StatusChip({ status }) {
  const [label, style] = STATUS[status]
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${style}`}>{label}</span>
}

const money = (v) => (Math.round(v * 100) / 100).toFixed(2)

// ---------- the three actions ----------
function AuctionForm({ item, card, onDone }) {
  const { listOnAuction } = useVault()
  const { user } = useAuctions()
  const [start, setStart] = useState(money(Math.max(0.99, item.value * 0.6)))
  const [buyNow, setBuyNow] = useState(money(Math.max(item.value * 1.15, item.value * 0.6 + 1)))
  const [minutes, setMinutes] = useState(60)
  const [error, setError] = useState('')
  if (!user.verified) {
    return (
      <p className="rounded-lg bg-navy-950/60 p-3 text-sm text-slate-300 ring-1 ring-navy-600">
        Only verified sellers can list on the Auction House.{' '}
        <Link to="/auctions?tab=sell" className="font-semibold text-gold-300 hover:underline">Get verified (takes a minute) →</Link>
      </p>
    )
  }
  const submit = (e) => {
    e.preventDefault()
    const s = parseFloat(start)
    const b = buyNow ? parseFloat(buyNow) : null
    if (!(s >= 0.99)) return setError('The starting price must be at least $0.99.')
    if (b !== null && !(b > s)) return setError('Buy Now has to be higher than the starting price.')
    const result = listOnAuction(item.id, { startPrice: s, buyNow: b, minutes })
    if (result.error) return setError(result.error)
    onDone(`Listed on the Auction House. It ends in ${DURATIONS.find((d) => d.minutes === minutes).label}.`, `/auctions/${result.id}`)
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="label">Starting price</span>
          <input className="input" type="number" min="0.99" step="0.01" inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="block">
          <span className="label">Buy Now (optional)</span>
          <input className="input" type="number" step="0.01" inputMode="decimal" value={buyNow} onChange={(e) => setBuyNow(e.target.value)} />
        </label>
      </div>
      <label className="block">
        <span className="label">Duration</span>
        <select className="input" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
          {DURATIONS.map((d) => <option key={d.minutes} value={d.minutes}>{d.label}</option>)}
        </select>
      </label>
      <p className="text-xs text-slate-400">
        Market value {formatPrice(item.value)} · {SELLER_FEE * 100}% seller fee when it sells
      </p>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button type="submit" className="btn-gold w-full">List on auction</button>
    </form>
  )
}

function SingleForm({ item, onDone }) {
  const { listAsSingle } = useVault()
  const [price, setPrice] = useState(money(item.value))
  const [error, setError] = useState('')
  const p = parseFloat(price)
  const submit = (e) => {
    e.preventDefault()
    const result = listAsSingle(item.id, p)
    if (result.error) return setError(result.error)
    onDone('Listed in Singles. It now shows in the shop.', `/product/${result.productId}`)
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <label className="block">
        <span className="label">Your price</span>
        <input className="input" type="number" min="0.5" step="0.01" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
      </label>
      <p className="text-xs text-slate-400">
        Market value {formatPrice(item.value)}
        {p >= 0.5 && <> · you get {formatPrice(p * (1 - SELLER_FEE))} after the {SELLER_FEE * 100}% fee</>}
      </p>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button type="submit" className="btn-primary w-full">List in Singles</button>
    </form>
  )
}

function ShipForm({ item, onDone }) {
  const { ship } = useVault()
  const [form, setForm] = useState({ name: '', street: '', city: '', zip: '' })
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const submit = (e) => {
    e.preventDefault()
    if (Object.values(form).some((v) => !v.trim())) return setError('Fill in every field.')
    const result = ship(item.id, form)
    if (result.error) return setError(result.error)
    onDone(`On its way. Tracking number ${result.tracking}.`)
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <input className="input" placeholder="Full name" value={form.name} onChange={set('name')} aria-label="Full name" autoComplete="name" />
      <input className="input" placeholder="Street address" value={form.street} onChange={set('street')} aria-label="Street address" autoComplete="street-address" />
      <div className="grid grid-cols-2 gap-3">
        <input className="input" placeholder="City" value={form.city} onChange={set('city')} aria-label="City" autoComplete="address-level2" />
        <input className="input" placeholder="ZIP code" value={form.zip} onChange={set('zip')} aria-label="ZIP code" autoComplete="postal-code" />
      </div>
      <p className="text-xs text-slate-400">Shipped sleeved in a top-loader, tracked. Demo only: nothing is sent.</p>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button type="submit" className="btn-ghost w-full">Ship it to me</button>
    </form>
  )
}

// ---------- card panel ----------
function CardPanel({ item, onClose }) {
  const { unlistSingle, listingIdFor } = useVault()
  const card = { ...getProduct(item.cardId), condition: item.condition }
  const [action, setAction] = useState(null)
  const [done, setDone] = useState(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const ACTIONS = [
    ['auction', '⚖ List on auction'],
    ['single', '🏷 List in Singles'],
    ['ship', '📦 Ship to me'],
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-950/80 p-0 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={card.name}
        className="panel max-h-[92vh] w-full max-w-3xl animate-pop-in overflow-y-auto rounded-b-none p-5 sm:rounded-2xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end">
          <button onClick={onClose} className="text-2xl leading-none text-slate-400 hover:text-white" aria-label="Close">×</button>
        </div>
        <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
          <div className="mx-auto w-44 sm:w-full">
            <CardArt product={card} size="lg" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <RarityBadge rarity={card.rarity} />
              <StatusChip status={item.status} />
            </div>
            <h2 className="mt-2 text-2xl font-bold">{card.name}</h2>
            <p className="text-sm text-slate-400">
              {card.set} · #{card.number} · {item.condition}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-navy-950/60 p-3 ring-1 ring-navy-700">
                <dt className="text-[11px] text-slate-400">Market value</dt>
                <dd className="font-display text-lg font-bold">{formatPrice(item.value)}</dd>
              </div>
              <div className="rounded-lg bg-navy-950/60 p-3 ring-1 ring-navy-700">
                <dt className="text-[11px] text-slate-400">Pulled from</dt>
                <dd className="truncate font-semibold">
                  {item.from.packName}
                  {item.from.packNumber ? ` #${item.from.packNumber}` : ''}
                </dd>
                <dd className="text-[11px] text-slate-500">{new Date(item.pulledAt).toLocaleDateString()}</dd>
              </div>
            </dl>

            <div className="mt-5">
              {done ? (
                <div className="rounded-xl border border-emerald-gem/40 bg-emerald-gem/10 p-4 text-sm text-emerald-200">
                  ✓ {done.text}{' '}
                  {done.href && (
                    <Link to={done.href} className="font-semibold text-emerald-300 underline">View it →</Link>
                  )}
                </div>
              ) : item.status === 'vault' ? (
                <>
                  <p className="label">What do you want to do with it?</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {ACTIONS.map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setAction(action === key ? null : key)}
                        aria-expanded={action === key}
                        className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                          action === key ? 'border-gold-400 bg-gold-400/10 text-white' : 'border-navy-500 text-slate-300 hover:text-white'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-4">
                    {action === 'auction' && <AuctionForm item={item} card={card} onDone={(text, href) => setDone({ text, href })} />}
                    {action === 'single' && <SingleForm item={item} onDone={(text, href) => setDone({ text, href })} />}
                    {action === 'ship' && <ShipForm item={item} onDone={(text) => setDone({ text })} />}
                  </div>
                </>
              ) : item.status === 'auction' ? (
                <p className="text-sm text-slate-300">
                  On the Auction House now. <Link to={`/auctions/${item.auctionId}`} className="font-semibold text-gold-300 hover:underline">View auction →</Link>{' '}
                  If it ends without bids, it comes back to your vault.
                </p>
              ) : item.status === 'single' ? (
                <div className="space-y-3 text-sm text-slate-300">
                  <p>
                    Listed in Singles for <span className="font-semibold text-white">{formatPrice(item.listingPrice)}</span>.{' '}
                    <Link to={`/product/${listingIdFor(item)}`} className="font-semibold text-sky-300 hover:underline">View listing →</Link>
                  </p>
                  <button className="btn-ghost" onClick={() => unlistSingle(item.id)}>Remove listing and keep it in my vault</button>
                </div>
              ) : item.status === 'shipped' ? (
                <p className="text-sm text-slate-300">
                  Shipped {new Date(item.shippedAt).toLocaleDateString()} to {item.shipTo}. Tracking <span className="font-mono text-white">{item.tracking}</span>
                </p>
              ) : (
                <p className="text-sm text-slate-300">
                  Sold at auction to {item.soldTo} for <span className="font-semibold text-white">{formatPrice(item.soldFor)}</span>. You get{' '}
                  {formatPrice(item.soldFor * (1 - SELLER_FEE))} after the fee.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Vault() {
  const { items } = useVault()
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('value')
  const [openId, setOpenId] = useState(null)

  const shown = items
    .filter((i) => matches(filter, i.status))
    .sort((a, b) =>
      sort === 'value'
        ? b.value - a.value
        : sort === 'rarity'
          ? rarityRank(getProduct(b.cardId).rarity) - rarityRank(getProduct(a.cardId).rarity) || b.value - a.value
          : b.pulledAt.localeCompare(a.pulledAt),
    )
  const held = items.filter((i) => i.status === 'vault')
  const open = items.find((i) => i.id === openId)

  const stats = [
    ['Cards in vault', held.length],
    ['Vault value', formatPrice(held.reduce((s, i) => s + i.value, 0))],
    ['Listed', items.filter((i) => i.status === 'auction' || i.status === 'single').length],
    ['Shipped & sold', items.filter((i) => i.status === 'shipped' || i.status === 'sold').length],
  ]

  return (
    <div className="container-page py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="label text-emerald-300">Your Vault</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Every card you've pulled</h1>
          <p className="mt-3 text-slate-300">
            Cards from your rips are stored safely here. Tap one to auction it, list it in Singles, or ship it home.
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map(([k, v]) => (
            <div key={k} className="panel px-4 py-3 text-center">
              <dd className="font-display text-xl font-bold">{v}</dd>
              <dt className="text-[11px] text-slate-400">{k}</dt>
            </div>
          ))}
        </dl>
      </div>

      {items.length === 0 ? (
        <div className="panel mt-10 p-12 text-center">
          <p className="text-5xl">🔐</p>
          <h2 className="mt-4 text-xl font-bold">Your vault is empty</h2>
          <p className="mt-2 text-slate-400">Rip a pack and every card you pull lands here.</p>
          <Link to="/shop?type=pack" className="btn-primary mt-6">Find a pack</Link>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2" role="tablist">
              {FILTERS.map(([key, label]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={filter === key}
                  onClick={() => setFilter(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filter === key ? 'bg-emerald-gem text-navy-950' : 'bg-navy-800 text-slate-300 hover:text-white'}`}
                >
                  {label} ({items.filter((i) => matches(key, i.status)).length})
                </button>
              ))}
            </div>
            <select className="input w-auto" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort vault">
              <option value="value">Most valuable</option>
              <option value="rarity">Rarest</option>
              <option value="recent">Most recent</option>
            </select>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {shown.map((item) => {
              const card = getProduct(item.cardId)
              return (
                <button
                  key={item.id}
                  onClick={() => setOpenId(item.id)}
                  className="panel group flex flex-col p-3 text-left transition hover:-translate-y-1 hover:border-emerald-gem/50"
                  aria-label={`${card.name}, ${STATUS[item.status][0]}`}
                >
                  <div className="relative px-1">
                    <CardArt product={{ ...card, condition: item.condition }} />
                    <span className="absolute left-0 top-0"><StatusChip status={item.status} /></span>
                  </div>
                  <p className="mt-3 truncate text-sm font-semibold">{card.name}</p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <RarityBadge rarity={card.rarity} />
                    <span className="font-display text-sm font-bold">{formatPrice(item.value)}</span>
                  </div>
                </button>
              )
            })}
          </div>
          {shown.length === 0 && <p className="panel mt-6 p-8 text-center text-sm text-slate-400">Nothing here yet.</p>}
        </>
      )}

      {open && <CardPanel key={open.id} item={open} onClose={() => setOpenId(null)} />}
    </div>
  )
}

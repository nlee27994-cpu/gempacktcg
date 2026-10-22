import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuctionCard from '../components/AuctionCard'
import CardArt from '../components/CardArt'
import { YOU, isEnded, leader, useAuctions, viewerStatus } from '../context/AuctionContext'
import { CONDITION_VALUE, DURATIONS, SELLER_FEE } from '../lib/auction'
import { GAMES, getProduct, singles } from '../lib/catalog'
import { formatPrice } from '../lib/format'
import { RARITIES } from '../lib/rarity'
import useNow from '../lib/useNow'

const TABS = [
  ['browse', 'Browse'],
  ['activity', 'My activity'],
  ['sell', 'Sell a card'],
]

const SORTS = {
  ending: (a, b) => a.endsAt - b.endsAt,
  'price-asc': (a, b) => price(a) - price(b),
  'price-desc': (a, b) => price(b) - price(a),
  bids: (a, b) => b.bidCount - a.bidCount,
}
const price = (a) => (a.bidCount ? a.currentBid : a.startPrice)

function Browse({ now }) {
  const { auctions } = useAuctions()
  const [f, setF] = useState({ q: '', game: '', rarity: '', seller: '', buyNowOnly: false, sort: 'ending' })
  const set = (key) => (e) => setF((prev) => ({ ...prev, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const live = auctions.filter((a) => !isEnded(a, now))
  const words = f.q.toLowerCase().split(/\s+/).filter(Boolean)
  const results = live
    .filter((a) => {
      const card = getProduct(a.cardId)
      if (f.game && card.game !== f.game) return false
      if (f.rarity && card.rarity !== f.rarity) return false
      if (f.seller && a.sellerType !== f.seller) return false
      if (f.buyNowOnly && !a.buyNow) return false
      const hay = `${card.name} ${card.set} ${a.seller}`.toLowerCase()
      return words.every((w) => hay.includes(w))
    })
    .sort(SORTS[f.sort])

  return (
    <>
      <div className="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <input className="input lg:col-span-2" type="search" placeholder="Search cards, sets, sellers…" value={f.q} onChange={set('q')} aria-label="Search auctions" />
        <select className="input" value={f.game} onChange={set('game')} aria-label="Game">
          <option value="">All games</option>
          {GAMES.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select className="input" value={f.rarity} onChange={set('rarity')} aria-label="Rarity">
          <option value="">All rarities</option>
          {RARITIES.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select className="input" value={f.seller} onChange={set('seller')} aria-label="Seller">
          <option value="">All sellers</option>
          <option value="Official">Official (Gempack)</option>
          <option value="Verified">Verified collectors</option>
        </select>
        <select className="input" value={f.sort} onChange={set('sort')} aria-label="Sort">
          <option value="ending">Ending soonest</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
          <option value="bids">Most bids</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-300 lg:col-span-6">
          <input type="checkbox" checked={f.buyNowOnly} onChange={set('buyNowOnly')} className="h-4 w-4 accent-amber-400" />
          Only show auctions with a Buy Now price
        </label>
      </div>
      <p className="mt-4 text-sm text-slate-400">{results.length} live auctions</p>
      {results.length === 0 ? (
        <div className="panel mt-4 p-12 text-center text-slate-400">No live auctions match. Try clearing a filter.</div>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
          {results.map((a) => (
            <AuctionCard key={a.id} auction={a} now={now} />
          ))}
        </div>
      )}
    </>
  )
}

function Section({ title, empty, auctions, now }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">
        {title} <span className="text-sm font-normal text-slate-500">({auctions.length})</span>
      </h2>
      {auctions.length === 0 ? (
        <p className="panel p-5 text-sm text-slate-400">{empty}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {auctions.map((a) => (
            <AuctionCard key={a.id} auction={a} now={now} />
          ))}
        </div>
      )}
    </section>
  )
}

function Activity({ now }) {
  const { auctions, paid, reset } = useAuctions()
  const by = (pred) => auctions.filter((a) => pred(viewerStatus(a, now), a))
  return (
    <div className="space-y-10">
      <Section title="Won: pay to claim" empty="Auctions you win show up here." auctions={by((s, a) => s === 'Won' && !paid[a.id])} now={now} />
      <Section title="Active bids" empty="You haven't bid on anything that's still live." auctions={by((s) => s === 'Winning' || s === 'Outbid')} now={now} />
      <Section title="Your listings" empty="Cards you list for auction show up here." auctions={by((s, a) => a.seller === YOU)} now={now} />
      <Section title="History" empty="Finished auctions you bid on show up here." auctions={by((s, a) => s === 'Lost' || (s === 'Won' && paid[a.id]))} now={now} />
      <button className="text-xs text-slate-500 hover:text-rose-400" onClick={reset}>
        Reset the auction house (demo)
      </button>
    </div>
  )
}

function VerifyPanel() {
  const { verify } = useAuctions()
  const [form, setForm] = useState({ name: '', email: '', id: false, terms: false })
  const [error, setError] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !/^\S+@\S+\.\S+$/.test(form.email) || !form.id || !form.terms) {
      setError('Fill in your name and email, and tick both boxes.')
      return
    }
    verify({ name: form.name.trim(), email: form.email })
  }
  return (
    <form onSubmit={submit} noValidate className="panel mx-auto max-w-xl space-y-4 p-6">
      <div>
        <p className="label text-sky-300">Step 1 of 2</p>
        <h2 className="text-2xl font-bold">Get verified to sell</h2>
        <p className="mt-1 text-sm text-slate-400">
          Only Gempack staff and verified collectors can list cards. Verification keeps fakes and scammers out of the Auction House.
        </p>
      </div>
      <label className="block">
        <span className="label">Full name</span>
        <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" />
      </label>
      <label className="block">
        <span className="label">Email</span>
        <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" />
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-300">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-emerald-500" checked={form.id} onChange={(e) => setForm({ ...form, id: e.target.checked })} />
        I've uploaded a photo ID for review (demo: nothing is uploaded).
      </label>
      <label className="flex items-start gap-2 text-sm text-slate-300">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-emerald-500" checked={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.checked })} />
        When a card sells, I'll ship it to Gempack for authentication. I get paid once it passes.
      </label>
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button type="submit" className="btn-primary w-full py-3">Verify my account</button>
    </form>
  )
}

function ListingForm() {
  const { createListing, user } = useAuctions()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [cardId, setCardId] = useState(null)
  const [condition, setCondition] = useState('Near Mint')
  const [startPrice, setStartPrice] = useState('')
  const [buyNow, setBuyNow] = useState('')
  const [minutes, setMinutes] = useState(60)
  const [error, setError] = useState('')

  const matches = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    if (!words.length) return []
    return singles.filter((c) => words.every((w) => `${c.name} ${c.set}`.toLowerCase().includes(w))).slice(0, 6)
  }, [q])

  const card = cardId && getProduct(cardId)
  const worth = card ? card.marketPrice * CONDITION_VALUE[condition] : 0
  const start = parseFloat(startPrice)
  const bn = parseFloat(buyNow)

  const choose = (c) => {
    setCardId(c.id)
    setQ('')
    // Suggested prices: start at 60% of value, Buy Now at 115% (always above the start, even for cheap cards)
    const value = c.marketPrice * CONDITION_VALUE[condition]
    const suggestedStart = Math.max(0.99, Math.round(value * 0.6 * 100) / 100)
    setStartPrice(suggestedStart.toFixed(2))
    setBuyNow(Math.max(suggestedStart + 1, Math.round(value * 1.15 * 100) / 100).toFixed(2))
  }

  const submit = (e) => {
    e.preventDefault()
    if (!card) return setError('Pick the card you want to sell.')
    if (!(start >= 0.99)) return setError('The starting price must be at least $0.99.')
    if (buyNow && !(bn > start)) return setError('Buy Now has to be higher than the starting price.')
    const result = createListing({ cardId, condition, startPrice: start, buyNow: buyNow ? bn : null, minutes })
    if (result.error) return setError(result.error)
    navigate(`/auctions/${result.id}`)
  }

  return (
    <form onSubmit={submit} noValidate className="panel mx-auto max-w-3xl p-6">
      <p className="label text-sky-300">Verified as {user.name ?? user.handle}</p>
      <h2 className="text-2xl font-bold">List a card for auction</h2>

      <div className="mt-6 grid gap-6 sm:grid-cols-[160px_1fr]">
        <div className="mx-auto w-32 sm:w-full">
          {card ? (
            <CardArt product={{ ...card, condition }} />
          ) : (
            <div className="flex aspect-[5/7] items-center justify-center rounded-xl border-2 border-dashed border-navy-500 p-3 text-center text-xs text-slate-500">
              Search for a card to list
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="relative">
            <label className="block">
              <span className="label">Card</span>
              <input
                className="input"
                type="search"
                placeholder={card ? `${card.name} (search to change)` : 'Search, e.g. Charizard'}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            {matches.length > 0 && (
              <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-navy-500 bg-navy-900 shadow-xl">
                {matches.map((c) => (
                  <li key={c.id}>
                    <button type="button" onClick={() => choose(c)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-navy-700">
                      <span className="truncate">
                        {c.name} <span className="text-slate-500">· {c.set}</span>
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">{formatPrice(c.marketPrice)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">Condition</span>
              <select className="input" value={condition} onChange={(e) => setCondition(e.target.value)}>
                {Object.keys(CONDITION_VALUE).map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Duration</span>
              <select className="input" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
                {DURATIONS.map((d) => <option key={d.minutes} value={d.minutes}>{d.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Starting price</span>
              <input className="input" type="number" min="0.99" step="0.01" inputMode="decimal" value={startPrice} onChange={(e) => setStartPrice(e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Buy Now price (optional)</span>
              <input className="input" type="number" min="1" step="0.01" inputMode="decimal" value={buyNow} onChange={(e) => setBuyNow(e.target.value)} />
            </label>
          </div>

          {card && (
            <div className="rounded-xl bg-navy-950/60 p-4 text-sm ring-1 ring-navy-700">
              <p className="text-slate-400">
                Market value in this condition: <span className="font-semibold text-slate-100">{formatPrice(worth)}</span>
              </p>
              {start >= 0.99 && (
                <p className="mt-1 text-slate-400">
                  You get <span className="font-semibold text-emerald-300">{formatPrice(start * (1 - SELLER_FEE))}</span> if it sells at the
                  starting price
                  {bn > start && (
                    <>
                      , or <span className="font-semibold text-emerald-300">{formatPrice(bn * (1 - SELLER_FEE))}</span> at Buy Now
                    </>
                  )}
                  , after the {SELLER_FEE * 100}% seller fee.
                </p>
              )}
            </div>
          )}

          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button type="submit" className="btn-gold w-full py-3">List for auction</button>
        </div>
      </div>
    </form>
  )
}

export default function AuctionHouse() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'browse'
  const now = useNow()
  const { auctions, user } = useAuctions()

  const live = auctions.filter((a) => !isEnded(a, now))
  const stats = [
    ['Live auctions', live.length],
    ['Ending in 15 min', live.filter((a) => a.endsAt - now < 15 * 60 * 1000).length],
    ["You're winning", live.filter((a) => leader(a) === YOU && a.seller !== YOU).length],
  ]

  return (
    <div className="container-page py-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <p className="label text-gold-400">Auction House</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Bid on single cards</h1>
          <p className="mt-3 text-slate-300">
            Cards listed by Gempack and verified collectors. Bid, or take it now at the Buy Now price. Every card goes through Gempack
            for authentication before it ships to the winner.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-3">
          {stats.map(([k, v]) => (
            <div key={k} className="panel px-4 py-3 text-center">
              <dd className="font-display text-2xl font-bold">{v}</dd>
              <dt className="text-[11px] text-slate-400">{k}</dt>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-navy-700" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setParams(key === 'browse' ? {} : { tab: key })}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === key ? 'border-gold-400 text-white' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'browse' && <Browse now={now} />}
        {tab === 'activity' && <Activity now={now} />}
        {tab === 'sell' && (user.verified ? <ListingForm /> : <VerifyPanel />)}
      </div>

      {tab === 'browse' && (
        <p className="mt-10 text-center text-xs text-slate-500">
          Want to sell? <Link to="/auctions?tab=sell" className="font-semibold text-gold-300 hover:underline">Get verified and list a card →</Link>
        </p>
      )}
    </div>
  )
}

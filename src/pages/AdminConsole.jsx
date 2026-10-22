import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import RarityBadge from '../components/RarityBadge'
import SourceBadge from '../components/SourceBadge'
import { isEnded, leader, useAuctions, YOU } from '../context/AuctionContext'
import { TX_TYPES, useLedger } from '../context/LedgerContext'
import { useSeries } from '../context/SeriesContext'
import { formatCountdown } from '../lib/auction'
import { allProducts, DATA_VERSION, GAMES, getProduct, packs, singles } from '../lib/catalog'
import { formatPrice } from '../lib/format'
import { getSeries, seriesStatus } from '../lib/series'
import useNow from '../lib/useNow'

const TABS = [
  ['overview', 'Overview'],
  ['transactions', 'Transactions'],
  ['inventory', 'Inventory'],
  ['tools', 'Tools'],
]
const LOW_STOCK = 3
// One-of-a-kind listings (a collector's single copy) aren't "running low", so only products
// that started with more than LOW_STOCK units can be low
const stockStatus = (start, available) => (available === 0 ? 'Sold out' : available <= LOW_STOCK && start > LOW_STOCK ? 'Low' : 'In stock')
const PAGE = 50
const seriesList = packs.filter((p) => p.seriesId).map((p) => ({ pack: p, series: getSeries(p.seriesId) }))

const TYPE_STYLES = {
  order: 'bg-emerald-gem/15 text-emerald-300',
  'pack-rip': 'bg-amethyst-500/15 text-amethyst-300',
  'drop-open': 'bg-gold-400/15 text-gold-300',
  bid: 'bg-sky-400/10 text-sky-300',
  'buy-now': 'bg-gold-400/15 text-gold-300',
  'auction-ended': 'bg-navy-700 text-slate-300',
  'listing-created': 'bg-sky-400/15 text-sky-200',
  'auction-claimed': 'bg-emerald-gem/10 text-emerald-200',
  'seller-verified': 'bg-sky-400/15 text-sky-300',
}

const sum = (list, fn) => list.reduce((s, x) => s + fn(x), 0)
const time = (iso) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit' })

function download(filename, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

const csvCell = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`
const toCsv = (entries) =>
  [['tx', 'time', 'type', 'actor', 'summary', 'amount', 'data'], ...entries.map((e) => [e.tx, e.at, e.type, e.actor, e.summary, e.amount, JSON.stringify(e.data)])]
    .map((row) => row.map(csvCell).join(','))
    .join('\n')

function TypeBadge({ type }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${TYPE_STYLES[type] ?? 'bg-navy-700'}`}>{TX_TYPES[type] ?? type}</span>
}

function Stat({ label, value, hint }) {
  return (
    <div className="panel p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  )
}

function Table({ head, children }) {
  return (
    <div className="panel overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-navy-600 text-[11px] uppercase tracking-wider text-slate-400">
          <tr>{head.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2.5 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-navy-800">{children}</tbody>
      </table>
    </div>
  )
}

// ---------- Overview ----------
function Overview({ entries, go }) {
  const { auctions } = useAuctions()
  const { openedFor } = useSeries()
  const { stockFor } = useLedger()
  const now = useNow(5000)

  const of = (type) => entries.filter((e) => e.type === type)
  const orders = of('order')
  const rips = [...of('pack-rip'), ...of('drop-open')]
  const ended = of('auction-ended').filter((e) => e.data.winner)
  const catalog = [...packs.filter((p) => !p.seriesId), ...singles]
  const statuses = catalog.map((p) => stockStatus(p.stock, stockFor(p.id)))

  const stats = [
    ['Gross sales', formatPrice(sum(orders, (e) => e.amount)), `${orders.length} orders`],
    ['Units sold', sum(orders, (e) => sum(e.data.items, (i) => i.qty)), 'Across all orders'],
    ['Packs ripped', rips.length, `${of('drop-open').length} from Series drops`],
    ['Floor credit paid', formatPrice(sum(rips, (e) => e.data.floorCredit ?? 0)), 'Store credit owed to rippers'],
    ['Auction sales', formatPrice(sum(ended, (e) => e.amount)), `${ended.length} auctions sold`],
    ['Gempack auction revenue', formatPrice(sum(ended, (e) => e.data.gempackRevenue ?? 0)), 'Own listings + 5% fees'],
    ['Live auctions', auctions.filter((a) => !isEnded(a, now)).length, `${of('bid').length} bids recorded`],
    ['Drop packs left', sum(seriesList, ({ series }) => series.packs.length - openedFor(series.id).length), `of ${sum(seriesList, ({ series }) => series.packs.length)} printed`],
    ['Low stock', statuses.filter((s) => s === 'Low').length, `${statuses.filter((s) => s === 'Sold out').length} sold out`],
    ['Inventory value', formatPrice(sum(catalog, (p) => p.price * stockFor(p.id))), 'Price × units in stock'],
  ]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(([label, value, hint]) => <Stat key={label} label={label} value={value} hint={hint} />)}
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Latest transactions</h2>
          <button className="text-sm font-semibold text-emerald-300 hover:underline" onClick={() => go('transactions')}>All transactions →</button>
        </div>
        <TransactionTable entries={entries.slice(0, 10)} />
      </div>
    </div>
  )
}

// ---------- Transactions ----------
function TransactionTable({ entries }) {
  const [open, setOpen] = useState(null)
  if (!entries.length) {
    return <p className="panel p-8 text-center text-sm text-slate-400">No transactions yet. Buy something, rip a pack or place a bid, and it shows up here.</p>
  }
  return (
    <Table head={['Transaction', 'Time', 'Type', 'Actor', 'Summary', 'Amount']}>
      {entries.map((e) => (
        <FragmentRow key={e.tx} entry={e} open={open === e.tx} onToggle={() => setOpen(open === e.tx ? null : e.tx)} />
      ))}
    </Table>
  )
}

function FragmentRow({ entry: e, open, onToggle }) {
  return (
    <>
      <tr className="cursor-pointer hover:bg-navy-800/60" onClick={onToggle} aria-expanded={open}>
        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gold-300">{e.tx}</td>
        <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-400">{time(e.at)}</td>
        <td className="px-3 py-2"><TypeBadge type={e.type} /></td>
        <td className="whitespace-nowrap px-3 py-2 text-xs">{e.actor}</td>
        <td className="px-3 py-2 text-xs text-slate-300">{e.summary}</td>
        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums">{e.amount ? formatPrice(e.amount) : '—'}</td>
      </tr>
      {open && (
        <tr className="bg-navy-950/60">
          <td colSpan={6} className="px-3 py-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs text-slate-400">Full record for <span className="font-mono text-gold-300">{e.tx}</span></p>
              <button className="text-xs font-semibold text-emerald-300 hover:underline" onClick={() => navigator.clipboard?.writeText(JSON.stringify(e, null, 2))}>
                Copy JSON
              </button>
            </div>
            <pre className="max-h-80 overflow-auto rounded-lg bg-navy-950 p-3 text-[11px] leading-relaxed text-slate-300 ring-1 ring-navy-700">{JSON.stringify(e, null, 2)}</pre>
          </td>
        </tr>
      )}
    </>
  )
}

function Transactions({ entries }) {
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [actor, setActor] = useState('')
  const [limit, setLimit] = useState(PAGE)

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return entries.filter((e) => {
      if (type && e.type !== type) return false
      if (actor === 'you' && e.actor !== YOU && e.type !== 'order' && e.type !== 'seller-verified') return false
      if (actor === 'rivals' && !(e.type === 'bid' && e.actor !== YOU)) return false
      // Search covers the transaction number, summary and every field of the data
      return !needle || `${e.tx} ${e.summary} ${e.actor} ${JSON.stringify(e.data)}`.toLowerCase().includes(needle)
    })
  }, [entries, q, type, actor])

  const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-')
  return (
    <div className="space-y-4">
      <div className="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]">
        <input className="input" type="search" placeholder="Search by TX number, card, order number, customer…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search transactions" />
        <select className="input" value={type} onChange={(e) => setType(e.target.value)} aria-label="Transaction type">
          <option value="">All types</option>
          {Object.entries(TX_TYPES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
        </select>
        <select className="input" value={actor} onChange={(e) => setActor(e.target.value)} aria-label="Who">
          <option value="">Everyone</option>
          <option value="you">Customer activity</option>
          <option value="rivals">Simulated rival bids</option>
        </select>
        <div className="flex gap-2">
          <button className="btn-ghost px-3 py-2 text-xs" onClick={() => download(`gempack-transactions-${stamp}.csv`, toCsv(results), 'text/csv')}>Export CSV</button>
          <button className="btn-ghost px-3 py-2 text-xs" onClick={() => download(`gempack-transactions-${stamp}.json`, JSON.stringify(results, null, 2), 'application/json')}>Export JSON</button>
        </div>
      </div>
      <p className="text-sm text-slate-400">
        {results.length} of {entries.length} transactions · click a row to see its full data
      </p>
      <TransactionTable entries={results.slice(0, limit)} />
      {limit < results.length && (
        <div className="text-center">
          <button className="btn-ghost" onClick={() => setLimit((l) => l + PAGE)}>Show more ({results.length - limit} left)</button>
        </div>
      )}
    </div>
  )
}

// ---------- Inventory ----------
function Inventory() {
  const { stockFor, sold } = useLedger()
  const { openedFor } = useSeries()
  const { auctions } = useAuctions()
  const now = useNow(5000)
  const [view, setView] = useState('products')
  const [q, setQ] = useState('')
  const [game, setGame] = useState('')
  const [status, setStatus] = useState('')

  const rows = allProducts
    .filter((p) => !p.seriesId)
    .map((p) => {
      const available = stockFor(p.id)
      return { p, available, status: stockStatus(p.stock, available) }
    })
    .filter(({ p, status: s }) => {
      if (game && p.game !== game) return false
      if (status && s !== status) return false
      return !q || `${p.id} ${p.name} ${p.set} ${p.seller}`.toLowerCase().includes(q.toLowerCase())
    })

  const STATUS = { 'Sold out': 'text-rose-400', Low: 'text-gold-300', 'In stock': 'text-emerald-300' }
  const VIEWS = [
    ['products', `Products (${allProducts.filter((p) => !p.seriesId).length})`],
    ['drops', `Series drops (${seriesList.length})`],
    ['auctions', `Auctions (${auctions.length})`],
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {VIEWS.map(([key, label]) => (
          <button key={key} onClick={() => setView(key)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${view === key ? 'bg-gold-400 text-navy-950' : 'bg-navy-800 text-slate-300 hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {view === 'products' && (
        <>
          <div className="panel grid gap-3 p-4 sm:grid-cols-3">
            <input className="input" type="search" placeholder="Search id, name, set, seller…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search inventory" />
            <select className="input" value={game} onChange={(e) => setGame(e.target.value)} aria-label="Game">
              <option value="">All games</option>
              {GAMES.map((g) => <option key={g}>{g}</option>)}
            </select>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Stock status">
              <option value="">Any stock status</option>
              <option>In stock</option>
              <option>Low</option>
              <option>Sold out</option>
            </select>
          </div>
          <p className="text-sm text-slate-400">
            {rows.length} products · {sum(rows, (r) => r.available)} units in stock worth {formatPrice(sum(rows, (r) => r.p.price * r.available))}
          </p>
          <Table head={['ID', 'Product', 'Rarity', 'Source', 'Price', 'Start', 'Sold', 'Available', 'Status']}>
            {rows.map(({ p, available, status: s }) => (
              <tr key={p.id} className="hover:bg-navy-800/60">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-400">{p.id}</td>
                <td className="px-3 py-2">
                  <Link to={`/product/${p.id}`} className="font-semibold hover:underline">{p.name}</Link>
                  <p className="text-[11px] text-slate-500">{p.type === 'pack' ? 'Pack' : `Single · ${p.condition}`} · {p.game}</p>
                </td>
                <td className="px-3 py-2"><RarityBadge rarity={p.rarity} /></td>
                <td className="px-3 py-2"><SourceBadge source={p.source} /></td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{formatPrice(p.price)}</td>
                <td className="px-3 py-2 tabular-nums text-slate-400">{p.stock}</td>
                <td className="px-3 py-2 tabular-nums text-slate-400">{sold.get(p.id) ?? 0}</td>
                <td className="px-3 py-2 font-semibold tabular-nums">{available}</td>
                <td className={`whitespace-nowrap px-3 py-2 text-xs font-semibold ${STATUS[s]}`}>{s}</td>
              </tr>
            ))}
          </Table>
        </>
      )}

      {view === 'drops' && (
        <Table head={['Drop', 'Price', 'Packs left', 'Card value sealed', 'Next pack has a Secret Rare', 'Floor (worst pack)']}>
          {seriesList.map(({ pack, series }) => {
            const st = seriesStatus(series, openedFor(series.id))
            return (
              <tr key={series.id} className="hover:bg-navy-800/60">
                <td className="px-3 py-2">
                  <Link to={`/product/${pack.id}#checklist`} className="font-semibold hover:underline">{pack.name}</Link>
                  <p className="font-mono text-[11px] text-slate-500">{series.id}</p>
                </td>
                <td className="px-3 py-2 tabular-nums">{formatPrice(pack.price)}</td>
                <td className="px-3 py-2 font-semibold tabular-nums">{st.packsLeft} / {st.totalPacks}</td>
                <td className="px-3 py-2 tabular-nums">{formatPrice(st.valueLeft)}</td>
                <td className="px-3 py-2 tabular-nums">{Math.round(st.secretRareChance * 100)}%</td>
                <td className="px-3 py-2 tabular-nums">{formatPrice(pack.priceFloor)}</td>
              </tr>
            )
          })}
        </Table>
      )}

      {view === 'auctions' && (
        <Table head={['ID', 'Card', 'Seller', 'Status', 'Bid', 'Bids', 'Buy Now', 'Ends / winner']}>
          {[...auctions].sort((a, b) => a.endsAt - b.endsAt).map((a) => {
            const ended = isEnded(a, now)
            return (
              <tr key={a.id} className="hover:bg-navy-800/60">
                <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-400">{a.id}</td>
                <td className="px-3 py-2">
                  <Link to={`/auctions/${a.id}`} className="font-semibold hover:underline">{getProduct(a.cardId).name}</Link>
                  <p className="text-[11px] text-slate-500">{a.condition}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">{a.seller} <span className="text-slate-500">({a.sellerType})</span></td>
                <td className={`px-3 py-2 text-xs font-semibold ${ended ? 'text-slate-400' : 'text-emerald-300'}`}>{ended ? 'Ended' : 'Live'}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{a.bidCount ? formatPrice(a.currentBid) : `from ${formatPrice(a.startPrice)}`}</td>
                <td className="px-3 py-2 tabular-nums">{a.bidCount}</td>
                <td className="whitespace-nowrap px-3 py-2 tabular-nums">{a.buyNow ? formatPrice(a.buyNow) : '—'}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs">{ended ? leader(a) ?? 'No bids' : formatCountdown(a.endsAt - now)}</td>
              </tr>
            )
          })}
        </Table>
      )}
    </div>
  )
}

// ---------- Tools ----------
function Tools({ entries }) {
  const { clear } = useLedger()
  const { reset: resetAuctions } = useAuctions()
  const { reset: resetDrop } = useSeries()
  const [done, setDone] = useState('')
  const act = (label, fn) => {
    if (!window.confirm(`${label}? This can't be undone.`)) return
    fn()
    setDone(`${label}: done.`)
  }
  const stamp = new Date().toISOString().slice(0, 19).replaceAll(':', '-')

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="panel space-y-3 p-5">
        <h2 className="font-semibold">Catalog</h2>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {[
            ['Catalog version', DATA_VERSION],
            ['Packs', packs.length],
            ['Singles', singles.length],
            ['Series drops', seriesList.length],
            ['Transactions stored', `${entries.length} (newest 2,000 kept)`],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-400">{k}</dt>
              <dd className="font-mono text-xs">{v}</dd>
            </div>
          ))}
        </dl>
        <button className="btn-ghost w-full" onClick={() => download(`gempack-ledger-${stamp}.json`, JSON.stringify(entries, null, 2), 'application/json')}>
          Download the full ledger (JSON)
        </button>
      </div>
      <div className="panel space-y-3 p-5">
        <h2 className="font-semibold">Demo resets</h2>
        <p className="text-sm text-slate-400">Handy before a presentation. These only affect this browser.</p>
        <button className="btn-ghost w-full" onClick={() => act('Clear the transaction ledger', clear)}>Clear transaction ledger</button>
        <button className="btn-ghost w-full" onClick={() => act('Reset the Auction House', resetAuctions)}>Reset Auction House</button>
        <button className="btn-ghost w-full" onClick={() => act('Refill every Series drop', () => seriesList.forEach(({ series }) => resetDrop(series.id)))}>Refill all Series drops</button>
        {done && <p role="status" className="text-sm text-emerald-300">{done}</p>}
      </div>
    </div>
  )
}

export default function AdminConsole() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') ?? 'overview'
  const { entries } = useLedger()
  const go = (key) => setParams(key === 'overview' ? {} : { tab: key })

  return (
    <div className="container-page py-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="label text-sky-300">Staff only</p>
          <h1 className="text-3xl font-bold sm:text-4xl">Dev Console</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Every transaction, with a unique transaction number and its full data, plus live inventory. In a real store this page would
            sit behind a staff login and read from a database. Here it reads this browser's saved activity.
          </p>
        </div>
        <span className="font-mono text-xs text-slate-500">catalog {DATA_VERSION}</span>
      </div>

      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-navy-700" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => go(key)}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              tab === key ? 'border-sky-400 text-white' : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            {label}
            {key === 'transactions' && <span className="ml-1.5 rounded-full bg-navy-700 px-1.5 text-[10px]">{entries.length}</span>}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'overview' && <Overview entries={entries} go={go} />}
        {tab === 'transactions' && <Transactions entries={entries} />}
        {tab === 'inventory' && <Inventory />}
        {tab === 'tools' && <Tools entries={entries} />}
      </div>
    </div>
  )
}

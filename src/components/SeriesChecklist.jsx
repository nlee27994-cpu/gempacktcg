import { useState } from 'react'
import { Link } from 'react-router-dom'
import CardArt from './CardArt'
import RarityBadge from './RarityBadge'
import { useSeries } from '../context/SeriesContext'
import { getProduct } from '../lib/catalog'
import { formatPrice } from '../lib/format'
import { RARITIES } from '../lib/rarity'
import { seriesStatus } from '../lib/series'

const HIT_TIERS = ['Secret Rare', 'Ultra Rare']

function ChecklistRow({ card, copies, left }) {
  const gone = left === 0
  return (
    <li className={`flex items-center gap-3 py-2 ${gone ? 'opacity-40' : ''}`}>
      <Link to={`/product/${card.id}`} className="w-9 shrink-0">
        {/* Drop copies are raw near-mint, whatever condition the shop listing is in */}
        <CardArt product={{ ...card, condition: 'Near Mint' }} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link to={`/product/${card.id}`} className={`block truncate text-sm font-semibold hover:underline ${gone ? 'line-through' : ''}`}>
          {card.name}
        </Link>
        <p className="truncate text-xs text-slate-400">
          {card.set} · {formatPrice(card.marketPrice)}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
          gone ? 'bg-navy-800 text-slate-400' : 'bg-emerald-gem/10 text-emerald-300'
        }`}
      >
        {gone ? 'All pulled' : `${left} of ${copies} left`}
      </span>
    </li>
  )
}

function RarityGroup({ rarity, entries, status }) {
  const left = entries.reduce((s, e) => s + status.remaining.get(e.id), 0)
  const total = entries.reduce((s, e) => s + e.copies, 0)
  return (
    <div>
      <div className="flex items-center justify-between border-b border-navy-700 pb-2">
        <RarityBadge rarity={rarity} />
        <span className="text-xs text-slate-400">
          {entries.length} cards · {left} of {total} copies still sealed
        </span>
      </div>
      <ul className="divide-y divide-navy-800">
        {entries.map((e) => (
          <ChecklistRow key={e.id} card={getProduct(e.id)} copies={e.copies} left={status.remaining.get(e.id)} />
        ))}
      </ul>
    </div>
  )
}

export default function SeriesChecklist({ pack, series }) {
  const { openedFor, reset } = useSeries()
  const [showAll, setShowAll] = useState(false)
  const opened = openedFor(series.id)
  const status = seriesStatus(series, opened)

  const groups = [...RARITIES]
    .reverse()
    .map((rarity) => [rarity, series.checklist.filter((e) => getProduct(e.id).rarity === rarity)])
    .filter(([, entries]) => entries.length)
  const hitGroups = groups.filter(([r]) => HIT_TIERS.includes(r))
  const otherGroups = groups.filter(([r]) => !HIT_TIERS.includes(r))
  const otherCount = otherGroups.reduce((s, [, e]) => s + e.length, 0)

  const stats = [
    ['Packs left', `${status.packsLeft} / ${status.totalPacks}`],
    ['Card value still sealed', formatPrice(status.valueLeft)],
    ['Next pack has a Secret Rare', `${Math.round(status.secretRareChance * 100)}%`],
  ]

  return (
    <section className="panel p-5 sm:p-6">
      <p className="label text-gold-400">{pack.set} · drop checklist</p>
      <h2 className="text-2xl font-bold">Every card in this drop</h2>
      <p className="mt-2 text-sm text-slate-300">
        This drop has a print run of <span className="font-semibold text-white">{status.totalPacks} packs</span>. Every card below
        is sealed into exactly one of them, so if you opened all {status.totalPacks} you'd get the whole checklist. We built every
        pack to hold at least <span className="font-semibold text-white">{formatPrice(series.minPackValue)}</span> in cards, half its
        price or more. When a card is pulled, it's gone from the drop.
      </p>

      <div className="mt-5 h-2.5 overflow-hidden rounded-full bg-navy-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-gold-400 to-amethyst-400 transition-all"
          style={{ width: `${(status.packsLeft / status.totalPacks) * 100}%` }}
        />
      </div>
      <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={k} className="rounded-xl bg-navy-950/60 p-3 ring-1 ring-navy-700">
            <dt className="text-[11px] text-slate-400">{k}</dt>
            <dd className="font-display text-lg font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 space-y-6">
        {hitGroups.map(([rarity, entries]) => (
          <RarityGroup key={rarity} rarity={rarity} entries={entries} status={status} />
        ))}
        {showAll && otherGroups.map(([rarity, entries]) => <RarityGroup key={rarity} rarity={rarity} entries={entries} status={status} />)}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button className="text-sm font-semibold text-emerald-300 hover:underline" onClick={() => setShowAll((s) => !s)}>
          {showAll ? 'Hide' : 'Show'} the other {otherCount} cards (Rares, Uncommons, Commons)
        </button>
        {opened.length > 0 && (
          <button className="text-xs text-slate-500 hover:text-rose-400" onClick={() => reset(series.id)}>
            Reset this drop (demo)
          </button>
        )}
      </div>
    </section>
  )
}

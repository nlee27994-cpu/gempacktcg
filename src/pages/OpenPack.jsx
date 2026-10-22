import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import CardArt from '../components/CardArt'
import { GemMark } from '../components/Logo'
import RarityBadge from '../components/RarityBadge'
import { useCart } from '../context/CartContext'
import { useSeries } from '../context/SeriesContext'
import { useLedger } from '../context/LedgerContext'
import { getProduct, seriesPacks } from '../lib/catalog'
import { formatPrice } from '../lib/format'
import { openPack } from '../lib/packOpening'
import { RARITY_STYLES, rarityRank } from '../lib/rarity'
import { getSeries, seriesPackResult } from '../lib/series'
import NotFound from './NotFound'

function FlipCard({ card, revealed, onReveal, index }) {
  const r = RARITY_STYLES[card.rarity]
  return (
    <button
      type="button"
      onClick={onReveal}
      disabled={revealed}
      className="perspective w-full animate-card-in text-left"
      style={{ animationDelay: `${index * 60}ms` }}
      aria-label={revealed ? `${card.name}, ${card.rarity}, ${formatPrice(card.pulledValue)}` : `Reveal card ${index + 1}`}
    >
      <div
        className={`relative transition-transform duration-500 [transform-style:preserve-3d] ${revealed ? '[transform:rotateY(180deg)]' : 'hover:-translate-y-1'}`}
      >
        {/* back */}
        <div className="flex aspect-[5/7] items-center justify-center rounded-xl border-2 border-navy-500 bg-gradient-to-br from-navy-700 via-navy-800 to-navy-950 [backface-visibility:hidden]">
          <GemMark className="h-1/3 w-1/3 opacity-80" />
          {card.isHit && <span className="absolute bottom-2 text-[10px] font-bold uppercase tracking-widest text-gold-300">Hit</span>}
        </div>
        {/* front */}
        <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <CardArt product={card} />
        </div>
      </div>
      <div className={`mt-2 h-10 text-center transition-opacity ${revealed ? 'opacity-100' : 'opacity-0'}`}>
        <p className={`text-xs font-semibold ${r.text}`}>{card.rarity}</p>
        <p className="font-display text-sm font-bold">{formatPrice(card.pulledValue)}</p>
      </div>
    </button>
  )
}

function Summary({ pack, result, onAgain, packsLeft }) {
  const { add } = useCart()
  const [added, setAdded] = useState(false)
  const best = [...result.cards].sort((a, b) => b.pulledValue - a.pulledValue)[0]
  const won = result.net >= 0
  const pct = Math.min(100, Math.round((result.pulledValue / pack.price) * 100))
  const floorPct = Math.round((pack.priceFloor / pack.price) * 100)

  return (
    <div className="panel mx-auto mt-10 max-w-3xl animate-pop-in p-6 sm:p-8">
      <div className="grid gap-6 sm:grid-cols-3">
        <div>
          <p className="label">Pack price</p>
          <p className="font-display text-3xl font-bold">{formatPrice(pack.price)}</p>
        </div>
        <div>
          <p className="label">Pulled value</p>
          <p className={`font-display text-3xl font-bold ${won ? 'text-emerald-gem' : 'text-slate-100'}`}>
            {formatPrice(result.pulledValue)}
          </p>
          {result.bulkCount > 0 && (
            <p className="text-xs text-slate-500">
              incl. {result.bulkCount} bulk cards ({formatPrice(result.bulkValue)})
            </p>
          )}
        </div>
        <div>
          <p className="label">{won ? 'You came out ahead' : result.floorCredit > 0 ? 'Net after floor credit' : 'Net'}</p>
          <p className={`font-display text-3xl font-bold ${won ? 'text-gold-400' : 'text-slate-300'}`}>
            {won ? '+' : '−'}
            {formatPrice(Math.abs(result.net))}
          </p>
        </div>
      </div>

      {/* value bar with floor marker */}
      <div className="relative mt-8">
        <div className="h-4 overflow-hidden rounded-full bg-navy-700">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${won ? 'from-emerald-gem via-amethyst-400 to-gold-400' : 'from-emerald-gem to-emerald-400'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="absolute -top-1 h-6 w-0.5 bg-gold-300" style={{ left: `${floorPct}%` }} />
        <div className="relative mt-2 h-4 text-xs text-slate-400">
          <span className="absolute left-0">$0</span>
          <span className="absolute -translate-x-1/2 whitespace-nowrap text-gold-300" style={{ left: `${floorPct}%` }}>
            Floor {formatPrice(pack.priceFloor)}
          </span>
          <span className="absolute right-0">{formatPrice(pack.price)}</span>
        </div>
      </div>

      {result.floorCredit > 0 ? (
        <p className="mt-8 rounded-xl border border-emerald-gem/40 bg-emerald-gem/10 p-4 text-sm text-emerald-200">
          🛡️ <span className="font-semibold">Floor protection kicked in.</span> Your pulls came in under the{' '}
          {formatPrice(pack.priceFloor)} floor, so we'd credit <span className="font-semibold">{formatPrice(result.floorCredit)}</span> to your
          Gempack account.
        </p>
      ) : (
        <p className="mt-8 rounded-xl border border-gold-400/40 bg-gold-400/10 p-4 text-sm text-gold-200">
          ✨ Best pull: <span className="font-semibold">{best.name}</span> ({best.rarity}) worth {formatPrice(best.pulledValue)}.
          You cleared the floor without needing protection.
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <button className="btn-gold" onClick={onAgain}>⚡ Rip another</button>
        <button
          className="btn-primary"
          onClick={() => {
            add(pack.id)
            setAdded(true)
          }}
        >
          {added ? '✓ Added. Rip it for real' : `Buy this pack · ${formatPrice(pack.price)}`}
        </button>
        <Link to={`/product/${pack.id}`} className="btn-ghost">Pack details</Link>
      </div>
      {packsLeft !== undefined && (
        <p className="mt-4 text-center text-sm text-slate-300">
          These cards are now out of the drop.{' '}
          <Link to={`/product/${pack.id}#checklist`} className="font-semibold text-gold-300 hover:underline">
            {packsLeft === 0 ? 'The drop is fully opened' : `${packsLeft} packs left`}: see what's still sealed →
          </Link>
        </p>
      )}
      <p className="mt-4 text-center text-xs text-slate-500">
        Demo rip: values use near-mint market prices from our mock catalog. Nothing is charged.
      </p>
    </div>
  )
}

// Keyed on id so switching packs starts from a fresh, sealed pack
export default function OpenPack() {
  const { id } = useParams()
  return <OpenPackPage key={id} id={id} />
}

function OpenPackPage({ id }) {
  const pack = getProduct(id)
  const { openedFor, openNext, reset } = useSeries()
  const { record } = useLedger()
  const [phase, setPhase] = useState('sealed') // sealed -> ripping -> revealing
  const [round, setRound] = useState(0)
  const [result, setResult] = useState(null)
  const [revealed, setRevealed] = useState(() => new Set())

  if (!pack || pack.type !== 'pack') return <NotFound />

  // Series packs come out of a finite drop; store packs are rolled from the odds
  const series = pack.seriesId && getSeries(pack.seriesId)
  const packsLeft = series ? series.packs.length - openedFor(series.id).length : undefined
  const soldOut = series && packsLeft === 0

  const rip = () => {
    let opened
    if (series) {
      const cardIds = openNext(series)
      if (!cardIds) return
      opened = seriesPackResult(pack, cardIds)
    } else {
      opened = openPack(pack)
    }
    setResult(opened)
    const best = opened.cards.reduce((a, b) => (b.pulledValue > a.pulledValue ? b : a))
    record(series ? 'drop-open' : 'pack-rip', {
      summary: `${pack.name}: pulled ${formatPrice(opened.pulledValue)}, best ${best.name}`,
      amount: opened.pulledValue,
      data: {
        packId: pack.id,
        packName: pack.name,
        packPrice: pack.price,
        priceFloor: pack.priceFloor,
        ...(series && { seriesId: series.id, packsLeftAfter: packsLeft - 1 }),
        cards: opened.cards.map(({ id, name, rarity, set, pulledValue }) => ({ id, name, rarity, set, value: pulledValue })),
        bulkCards: opened.bulkCount,
        pulledValue: opened.pulledValue,
        floorCredit: opened.floorCredit,
        net: opened.net,
      },
    })
    setRound((r) => r + 1)
    setPhase('ripping')
    setTimeout(() => setPhase('revealing'), 750)
  }
  const again = () => {
    setRevealed(new Set())
    setResult(null)
    setPhase('sealed')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const reveal = (i) => setRevealed((prev) => new Set(prev).add(i))
  const revealAll = () => setRevealed(new Set(result.cards.map((_, i) => i)))

  const allRevealed = result && revealed.size === result.cards.length
  const running = (result?.cards ?? []).filter((_, i) => revealed.has(i)).reduce((s, c) => s + c.pulledValue, 0)
  const topRevealed = (result?.cards ?? [])
    .filter((_, i) => revealed.has(i))
    .reduce((best, c) => (best && rarityRank(best.rarity) >= rarityRank(c.rarity) ? best : c), null)

  return (
    <div className="container-page py-8">
      <div className="text-center">
        <p className="label text-gold-400">Rip a pack</p>
        <h1 className="text-3xl font-bold sm:text-4xl">{pack.name}</h1>
        <p className="mt-2 text-slate-400">
          {formatPrice(pack.price)} · Floor <span className="font-semibold text-emerald-300">{formatPrice(pack.priceFloor)}</span> ·{' '}
          {pack.hitSlots}× {pack.rarity}+ hit
        </p>
        {series && (
          <p className="mt-1 text-sm">
            <Link to={`/product/${pack.id}#checklist`} className="font-semibold text-gold-300 hover:underline">
              {pack.set} · {packsLeft} of {series.packs.length} packs left · see the checklist
            </Link>
          </p>
        )}
      </div>

      {soldOut && phase === 'sealed' && (
        <div className="panel mx-auto mt-10 max-w-md p-8 text-center">
          <p className="text-4xl">📦</p>
          <h2 className="mt-3 text-xl font-bold">This drop is sold out</h2>
          <p className="mt-2 text-sm text-slate-400">
            All {series.packs.length} packs have been opened, and every card on the checklist has been pulled.
          </p>
          <button className="btn-ghost mt-6" onClick={() => reset(series.id)}>
            Reset this drop (demo)
          </button>
        </div>
      )}

      {phase !== 'revealing' && !(soldOut && phase === 'sealed') && (
        <div className="mt-10 flex flex-col items-center">
          <button
            type="button"
            onClick={phase === 'sealed' ? rip : undefined}
            className="group relative w-56 sm:w-64"
            aria-label="Rip the pack open"
          >
            <div className={`absolute inset-6 rounded-full bg-amethyst-500/30 blur-3xl ${phase === 'ripping' ? 'bg-gold-400/50' : ''}`} />
            {/* Two copies of the pack art, clipped into a top strip and a body, so the top can tear away */}
            <div className="relative">
              <div className={phase === 'ripping' ? 'animate-rip-top' : 'group-hover:animate-shake'} style={{ clipPath: 'inset(0 0 82% 0)' }}>
                <CardArt product={pack} size="lg" />
              </div>
              <div
                className={`absolute inset-0 ${phase === 'ripping' ? 'animate-rip-bottom' : 'group-hover:animate-shake'}`}
                style={{ clipPath: 'inset(18% 0 0 0)' }}
              >
                <CardArt product={pack} size="lg" />
              </div>
            </div>
            {phase === 'sealed' && (
              <div className="absolute inset-x-0 top-[18%] border-t-2 border-dashed border-white/50" />
            )}
          </button>
          {phase === 'sealed' && (
            <>
              <button className="btn-gold mt-8 px-10 py-3 text-base" onClick={rip}>
                ⚡ Rip it open
              </button>
              <p className="mt-3 text-xs text-slate-500">Free demo: tap the pack or the button</p>
            </>
          )}
        </div>
      )}

      {phase === 'revealing' && (
        <>
          <div className="sticky top-16 z-20 mx-auto mt-6 flex max-w-3xl items-center justify-between gap-3 rounded-xl border border-navy-600 bg-navy-900/95 px-4 py-3 backdrop-blur">
            <div>
              <p className="text-xs text-slate-400">
                {revealed.size}/{result.cards.length} revealed
              </p>
              <p className="font-display text-xl font-bold tabular-nums">{formatPrice(running)}</p>
            </div>
            {topRevealed && <RarityBadge rarity={topRevealed.rarity} prefix="Best: " />}
            {!allRevealed && (
              <button className="btn-ghost px-3 py-2 text-xs" onClick={revealAll}>
                Reveal all
              </button>
            )}
          </div>

          <p className="mt-4 text-center text-sm text-slate-400">{allRevealed ? 'All cards revealed' : 'Tap a card to flip it. Hits are last.'}</p>
          <div className="mx-auto mt-4 grid max-w-5xl grid-cols-3 gap-3 sm:grid-cols-4 sm:gap-4 lg:grid-cols-6">
            {result.cards.map((card, i) => (
              <FlipCard key={`${round}-${i}`} card={card} index={i} revealed={revealed.has(i)} onReveal={() => reveal(i)} />
            ))}
          </div>

          {allRevealed && <Summary pack={pack} result={result} onAgain={again} packsLeft={packsLeft} />}
        </>
      )}

      <section className="mx-auto mt-16 max-w-5xl">
        <h2 className="mb-4 text-center text-lg font-semibold text-slate-300">Try another pack</h2>
        <div className="flex flex-wrap justify-center gap-2">
          {seriesPacks
            .filter((p) => p.id !== pack.id)
            .map((p) => (
              <Link key={p.id} to={`/open/${p.id}`} className="rounded-full border border-navy-500 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-gold-400/60 hover:text-white">
                {p.name.replace('Gempack ', '').replace(' Pack', '')}
              </Link>
            ))}
          <Link to="/shop?type=pack" className="rounded-full border border-emerald-gem/40 px-3 py-1.5 text-xs font-semibold text-emerald-300">
            Browse all packs →
          </Link>
        </div>
      </section>
    </div>
  )
}

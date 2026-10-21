import { useState } from 'react'
import { Link } from 'react-router-dom'
import CardArt from '../components/CardArt'
import RarityBadge from '../components/RarityBadge'
import ProductCard from '../components/ProductCard'
import { events, featuredDrops, mysteryPacks, packs, singles } from '../lib/catalog'
import { formatDate, formatPrice, formatTime } from '../lib/format'
import useNow from '../lib/useNow'

const HOUR = 3600 * 1000

function countdown(ms) {
  if (ms <= 0) return 'Live now'
  const s = Math.floor(ms / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`
}

function Hero() {
  const [gold, amethyst, emerald] = ['Gold', 'Amethyst', 'Emerald'].map((t) =>
    mysteryPacks.find((p) => p.gemTier === t && p.game === 'Pokémon'),
  )
  return (
    <section className="container-page grid items-center gap-12 pb-16 pt-12 lg:grid-cols-2 lg:pt-20">
      <div>
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-gem/30 bg-emerald-gem/10 px-3 py-1 text-xs font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-gem" /> Pokémon · Magic: The Gathering · One Piece
        </p>
        <h1 className="text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl">
          Rip packs for the thrill.
          <br />
          <span className="gem-text">Every pack has a floor.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-slate-300">
          Sealed packs and singles from our own store, partner vendors and collectors who consign through us. Every pack
          lists a guaranteed minimum value, so you always know what's at stake before you rip.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/shop?type=pack" className="btn-primary px-6 py-3 text-base">Shop packs</Link>
          <Link to={`/open/${gold.id}`} className="btn-ghost px-6 py-3 text-base">Try a free demo rip →</Link>
        </div>
        <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
          {[
            [packs.length, 'sealed packs'],
            [singles.length, 'singles'],
            ['3', 'ways to buy'],
          ].map(([n, label]) => (
            <div key={label} className="panel px-2 py-3">
              <dt className="font-display text-2xl font-bold">{n}</dt>
              <dd className="text-xs text-slate-400">{label}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative mx-auto flex h-[340px] w-full max-w-md items-center justify-center sm:h-[420px]">
        <div className="absolute inset-10 rounded-full bg-amethyst-500/25 blur-3xl" />
        <Link to={`/product/${emerald.id}`} className="absolute left-0 top-12 w-32 -rotate-12 animate-float sm:w-40" style={{ animationDelay: '-1s' }}>
          <CardArt product={emerald} />
        </Link>
        <Link to={`/product/${amethyst.id}`} className="absolute right-0 top-12 w-32 rotate-12 animate-float sm:w-40" style={{ animationDelay: '-2s' }}>
          <CardArt product={amethyst} />
        </Link>
        <Link to={`/product/${gold.id}`} className="relative z-10 w-44 animate-float sm:w-52">
          <CardArt product={gold} size="lg" />
          <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-navy-950 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-gem/40">
            Floor {formatPrice(gold.priceFloor)}
          </span>
        </Link>
      </div>
    </section>
  )
}

function Drops() {
  const now = useNow()
  // Stagger drop times from page load: first is live, the rest unlock every few hours
  const [start] = useState(() => Date.now())
  return (
    <section className="container-page py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="label text-gold-400">Featured drops</p>
          <h2 className="text-3xl font-bold">Rare cards, dropping today</h2>
        </div>
        <Link to="/shop?type=single&rarity=Secret+Rare" className="hidden text-sm font-semibold text-emerald-300 hover:underline sm:block">
          All Secret Rares →
        </Link>
      </div>
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-6">
        {featuredDrops.map((card, i) => {
          const remaining = start + i * 3 * HOUR - now
          const live = remaining <= 0
          return (
            <Link
              key={card.id}
              to={`/product/${card.id}`}
              className="panel group w-40 shrink-0 snap-start p-3 transition hover:border-gold-400/60 sm:w-auto"
            >
              <div className={live ? '' : 'opacity-70 grayscale-[40%]'}>
                <CardArt product={card} />
              </div>
              <p className="mt-3 truncate text-sm font-semibold">{card.name}</p>
              <div className="mt-1 flex items-center justify-between">
                <RarityBadge rarity={card.rarity} />
              </div>
              <p className="mt-2 font-display text-lg font-bold">{formatPrice(card.price)}</p>
              <p className={`text-xs font-semibold ${live ? 'text-emerald-300' : 'text-gold-300'}`}>
                {live ? '● Live now' : `Drops in ${countdown(remaining)}`}
              </p>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function EventsBanner() {
  const [next, ...rest] = events
  return (
    <section className="container-page py-12">
      <div className="relative overflow-hidden rounded-3xl border border-amethyst-400/30 bg-gradient-to-br from-amethyst-600/30 via-navy-900 to-navy-900 p-6 sm:p-10">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gold-400/15 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <p className="label text-amethyst-300">Upcoming events</p>
            <span className="inline-block rounded-full bg-gold-400/15 px-2.5 py-0.5 text-xs font-semibold text-gold-300">
              Next up · {next.type}
            </span>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{next.title}</h2>
            <p className="mt-2 text-slate-300">{next.blurb}</p>
            <p className="mt-4 text-sm font-semibold text-slate-200">
              {formatDate(next.date)} · {formatTime(next.date)} — {next.location}
            </p>
          </div>
          <ul className="space-y-3">
            {rest.map((e) => (
              <li key={e.id} className="flex gap-4 rounded-xl bg-navy-950/50 p-3 ring-1 ring-navy-600/60">
                <div className="w-14 shrink-0 rounded-lg bg-navy-800 py-1.5 text-center">
                  <p className="text-[10px] font-semibold uppercase text-amethyst-300">
                    {new Date(e.date).toLocaleDateString('en-US', { month: 'short' })}
                  </p>
                  <p className="font-display text-xl font-bold leading-none">{new Date(e.date).getDate()}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{e.title}</p>
                  <p className="text-xs text-slate-400">
                    {e.type} · {e.location}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}

function ThreeSources() {
  const items = [
    ['◆', 'Direct', 'Packs and singles from the Gempack storefront, pulled and graded in-house.', 'text-emerald-gem'],
    ['⇄', 'Partner vendors', "Trusted local game stores list their inventory with us, so there's more stock and fair prices.", 'text-sky-300'],
    ['✋', 'Consignment', 'Collectors send us their cards. We verify and list them, and they get paid when a card sells.', 'text-amethyst-300'],
  ]
  return (
    <section className="container-page py-12">
      <h2 className="text-center text-3xl font-bold">One cart, three sources</h2>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {items.map(([icon, title, body, color]) => (
          <div key={title} className="panel p-6">
            <span className={`text-2xl ${color}`}>{icon}</span>
            <h3 className="mt-3 text-lg font-semibold">{title}</h3>
            <p className="mt-1 text-sm text-slate-400">{body}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function Home() {
  return (
    <>
      <Hero />
      <Drops />
      <EventsBanner />
      <section className="container-page py-12">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="label text-emerald-300">Gempack exclusives</p>
            <h2 className="text-3xl font-bold">Mystery Packs: an Ultra Rare or better in every one</h2>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {mysteryPacks.slice(0, 5).map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
      <ThreeSources />
    </>
  )
}

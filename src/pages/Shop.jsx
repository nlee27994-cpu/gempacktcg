import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import ShopFilters from '../components/ShopFilters'
import { allProducts } from '../lib/catalog'
import { rarityRank } from '../lib/rarity'

const PAGE_SIZE = 24
const LIST_KEYS = ['game', 'rarity', 'source']

const SORTS = {
  featured: (a, b) => Number(b.featured) - Number(a.featured) || rarityRank(b.rarity) - rarityRank(a.rarity),
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  rarity: (a, b) => rarityRank(b.rarity) - rarityRank(a.rarity) || b.price - a.price,
  floor: (a, b) => (b.priceFloor ?? 0) / b.price - (a.priceFloor ?? 0) / a.price,
  name: (a, b) => a.name.localeCompare(b.name),
}

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const [visible, setVisible] = useState(PAGE_SIZE)
  const [showFilters, setShowFilters] = useState(false)

  const filters = {
    q: params.get('q') ?? '',
    type: params.get('type') ?? '',
    min: params.get('min') ?? '',
    max: params.get('max') ?? '',
    sort: params.get('sort') ?? 'featured',
    ...Object.fromEntries(LIST_KEYS.map((k) => [k, params.get(k)?.split(',').filter(Boolean) ?? []])),
  }

  const update = (fn) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        fn(next)
        return next
      },
      { replace: true },
    )
    setVisible(PAGE_SIZE)
  }
  // set('min', '10') or set({ min: '10', max: '50' }) — one URL update either way
  const set = (key, value) =>
    update((p) =>
      Object.entries(typeof key === 'object' ? key : { [key]: value }).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k))),
    )
  const toggle = (key, value) =>
    update((p) => {
      const cur = p.get(key)?.split(',').filter(Boolean) ?? []
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]
      next.length ? p.set(key, next.join(',')) : p.delete(key)
    })
  const reset = () => update((p) => ['q', 'type', 'min', 'max', ...LIST_KEYS].forEach((k) => p.delete(k)))

  const activeCount =
    LIST_KEYS.reduce((n, k) => n + filters[k].length, 0) + (filters.type ? 1 : 0) + (filters.min || filters.max ? 1 : 0) + (filters.q ? 1 : 0)

  const results = useMemo(() => {
    const words = filters.q.toLowerCase().split(/\s+/).filter(Boolean)
    const min = parseFloat(filters.min)
    const max = parseFloat(filters.max)
    return allProducts
      .filter((p) => {
        if (filters.type && p.type !== filters.type) return false
        if (filters.game.length && !filters.game.includes(p.game)) return false
        if (filters.rarity.length && !filters.rarity.includes(p.rarity)) return false
        if (filters.source.length && !filters.source.includes(p.source)) return false
        if (!Number.isNaN(min) && p.price < min) return false
        if (!Number.isNaN(max) && p.price > max) return false
        if (words.length) {
          const hay = `${p.name} ${p.set} ${p.game} ${p.seller} ${p.kind ?? ''}`.toLowerCase()
          if (!words.every((w) => hay.includes(w))) return false
        }
        return true
      })
      .sort(SORTS[filters.sort] ?? SORTS.featured)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  const title = filters.type === 'pack' ? 'Sealed packs' : filters.type === 'single' ? 'Singles' : 'Shop everything'

  return (
    <div className="container-page py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
          <p className="mt-1 text-sm text-slate-400">{results.length} results</p>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-72">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              className="input pl-9"
              placeholder="Search cards, sets, sellers…"
              value={filters.q}
              onChange={(e) => set('q', e.target.value)}
              aria-label="Search products"
            />
          </div>
          <select className="input w-auto" value={filters.sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort by">
            <option value="featured">Featured</option>
            <option value="price-asc">Price: low to high</option>
            <option value="price-desc">Price: high to low</option>
            <option value="rarity">Rarity</option>
            <option value="floor">Best floor %</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>
      </div>

      <button className="btn-ghost mt-4 w-full lg:hidden" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
        {showFilters ? 'Hide filters' : `Filters${activeCount ? ` (${activeCount})` : ''}`}
      </button>

      <div className="mt-6 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className={`${showFilters ? 'block' : 'hidden'} panel h-fit p-5 lg:sticky lg:top-24 lg:block`}>
          <ShopFilters filters={filters} toggle={toggle} set={set} reset={reset} activeCount={activeCount} />
        </aside>

        <div>
          {results.length === 0 ? (
            <div className="panel p-12 text-center">
              <p className="text-4xl">🔍</p>
              <p className="mt-3 font-semibold">No matches</p>
              <p className="mt-1 text-sm text-slate-400">Try a broader search or clear some filters.</p>
              <button className="btn-ghost mt-5" onClick={reset}>Clear filters</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                {results.slice(0, visible).map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {visible < results.length && (
                <div className="mt-8 text-center">
                  <button className="btn-ghost" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    Load more ({results.length - visible} left)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

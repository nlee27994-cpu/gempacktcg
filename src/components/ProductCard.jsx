import { Link } from 'react-router-dom'
import CardArt from './CardArt'
import RarityBadge from './RarityBadge'
import SourceBadge from './SourceBadge'
import { formatPrice } from '../lib/format'
import { GAME_SHORT } from '../lib/catalog'
import { useSeries } from '../context/SeriesContext'
import { getSeries } from '../lib/series'

export default function ProductCard({ product }) {
  const isPack = product.type === 'pack'
  const { openedFor } = useSeries()
  const series = product.seriesId && getSeries(product.seriesId)
  const packsLeft = series && series.packs.length - openedFor(series.id).length
  return (
    <Link
      to={`/product/${product.id}`}
      className="group panel flex flex-col p-3 transition hover:-translate-y-1 hover:border-slate-400/50"
    >
      <div className="perspective px-2 pt-1">
        <div className="transition duration-300 group-hover:[transform:rotateY(-8deg)_rotateX(4deg)]">
          <CardArt product={product} />
        </div>
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap gap-1">
          <RarityBadge rarity={product.rarity} prefix={isPack ? 'Hit: ' : ''} />
          <SourceBadge source={product.source} />
        </div>
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-100">{product.name}</h3>
        <p className="text-xs text-slate-400">
          {GAME_SHORT[product.game]} · {isPack ? `${product.cardsPerPack} cards` : product.condition}
        </p>
        {series && (
          <p className={`text-[11px] font-semibold ${packsLeft ? 'text-gold-300' : 'text-rose-400'}`}>
            {packsLeft ? `${packsLeft} of ${series.packs.length} packs left` : 'Sold out'}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between pt-1">
          <span className="font-display text-lg font-bold">{formatPrice(product.price)}</span>
          {isPack && (
            <span className="text-right text-[11px] leading-tight text-emerald-300">
              Floor
              <br />
              <span className="font-semibold">{formatPrice(product.priceFloor)}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

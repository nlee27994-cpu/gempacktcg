import { useState } from 'react'
import { GemMark } from './Logo'
import { RARITY_STYLES, isHolo } from '../lib/rarity'
import { chaseCard, getSeries } from '../lib/series'

// Placeholder art: no licensed images, so cards and packs are drawn with gradients.
const TINT = 'from-yellow-300/30 to-red-500/20'

// Simple inline icon so every platform renders the same thing (font glyphs vary)
export function GameIcon({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <circle cx="24" cy="24" r="20" />
      <path d="M4 24h13M31 24h13" />
      <circle cx="24" cy="24" r="6" />
    </svg>
  )
}

const GEM_TIER_GRADIENT = {
  Emerald: 'from-emerald-300 via-emerald-500 to-navy-800',
  Amethyst: 'from-amethyst-300 via-amethyst-600 to-navy-800',
  Gold: 'from-gold-300 via-gold-500 to-amethyst-600',
}

export default function CardArt({ product, size = 'md', className = '', packNumber }) {
  const r = RARITY_STYLES[product.rarity]
  const isPack = product.type === 'pack'
  const holo = isHolo(product.rarity)
  const big = size === 'lg'

  if (isPack && product.seriesId) return <GemPackCover pack={product} big={big} className={className} packNumber={packNumber} />

  if (isPack) {
    const gradient = product.gemTier ? GEM_TIER_GRADIENT[product.gemTier] : r.gradient
    return (
      <div className={`relative aspect-[5/7] w-full ${className}`}>
        <div
          className={`holo relative h-full w-full overflow-hidden rounded-xl bg-gradient-to-br ${gradient} ${r.glow}`}
          style={{ clipPath: 'polygon(6% 0, 94% 0, 100% 4%, 100% 96%, 94% 100%, 6% 100%, 0 96%, 0 4%)' }}
        >
          {/* crimped seals */}
          <div className="absolute inset-x-0 top-0 h-[6%] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.35)_0_3px,transparent_3px_7px)]" />
          <div className="absolute inset-x-0 bottom-0 h-[6%] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.35)_0_3px,transparent_3px_7px)]" />
          {/* facets */}
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.18)_0_30%,transparent_30%_60%,rgba(0,0,0,.15)_60%)]" />
          {product.image ? (
            <PackImage product={product} fallback={<DrawnPackLabel product={product} big={big} />} />
          ) : (
            <DrawnPackLabel product={product} big={big} />
          )}
        </div>
      </div>
    )
  }

  if (product.image) return <RealCardArt product={product} size={size} className={className} />

  return <DrawnCardArt product={product} big={big} holo={holo} className={className} />
}

// Real card scan from the Pokémon TCG API; falls back to drawn art if the image can't load
function RealCardArt({ product, size, className }) {
  const [failed, setFailed] = useState(false)
  const r = RARITY_STYLES[product.rarity]
  const big = size === 'lg'
  if (failed) return <DrawnCardArt product={product} big={big} holo={isHolo(product.rarity)} className={className} />
  return (
    <div className={`relative aspect-[5/7] w-full ${className}`}>
      <div className={`${isHolo(product.rarity) ? 'holo' : ''} relative h-full w-full overflow-hidden rounded-xl border-2 bg-navy-800 ${r.border} ${r.glow}`}>
        <img
          src={big && product.imageLarge ? product.imageLarge : product.image}
          alt={`${product.name}, ${product.set} #${product.number}`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
        <PsaLabel condition={product.condition} />
      </div>
    </div>
  )
}

function PsaLabel({ condition }) {
  if (!condition?.startsWith('PSA')) return null
  return (
    <span className="absolute right-2 top-2 rounded bg-white px-1.5 py-0.5 text-[9px] font-bold text-red-600 shadow">{condition}</span>
  )
}

function DrawnCardArt({ product, big, holo, className }) {
  const r = RARITY_STYLES[product.rarity]
  return (
    <div className={`relative aspect-[5/7] w-full ${className}`}>
      <div className={`${holo ? 'holo' : ''} relative flex h-full w-full flex-col overflow-hidden rounded-xl border-2 bg-navy-800 p-[6%] ${r.border} ${r.glow}`}>
        <div className={`relative flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${r.gradient}`}>
          <div className={`absolute inset-0 bg-gradient-to-tr ${TINT}`} />
          <GameIcon game={product.game} className={`relative ${big ? 'h-28 w-28' : 'h-1/2 w-1/2 max-h-16'} text-white/85 drop-shadow-lg`} />
        </div>
        <div className="mt-[5%]">
          <p className={`truncate font-display font-semibold leading-tight ${big ? 'text-lg' : 'text-[11px]'}`}>{product.name}</p>
          <p className={`truncate text-slate-400 ${big ? 'text-sm' : 'text-[9px]'}`}>
            {product.set} · #{product.number}
          </p>
        </div>
        <PsaLabel condition={product.condition} />
      </div>
    </div>
  )
}

const PACK_SHAPE = { clipPath: 'polygon(6% 0, 94% 0, 100% 4%, 100% 96%, 94% 100%, 6% 100%, 0 96%, 0 4%)' }
const CRIMP = 'absolute inset-x-0 h-[5%] bg-[repeating-linear-gradient(90deg,rgba(255,255,255,.35)_0_3px,transparent_3px_7px)]'

// Cover for Gempack's own drop packs: logo, the drop's chase card, and the pack title.
// The chase card is the drop's most valuable card, not this pack's contents.
function GemPackCover({ pack, big, className, packNumber }) {
  const chase = chaseCard(getSeries(pack.seriesId))
  const chaseStyle = RARITY_STYLES[chase.rarity]
  return (
    <div className={`relative aspect-[5/7] w-full ${className}`}>
      <div className={`holo relative h-full w-full overflow-hidden bg-gradient-to-br ${GEM_TIER_GRADIENT[pack.gemTier]} ${RARITY_STYLES[pack.rarity].glow}`} style={PACK_SHAPE}>
        <div className={`${CRIMP} top-0`} />
        <div className={`${CRIMP} bottom-0`} />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.18)_0_30%,transparent_30%_60%,rgba(0,0,0,.18)_60%)]" />

        <div className="absolute inset-x-0 top-[7%] bottom-[7%] flex flex-col items-center px-[8%] text-center">
          {/* brand */}
          <div className="flex items-center gap-1">
            <GemMark className={big ? 'h-6 w-6' : 'h-3.5 w-3.5'} />
            <span className={`font-display font-bold uppercase tracking-wider text-white drop-shadow ${big ? 'text-sm' : 'text-[8px]'}`}>Gempack TCG</span>
          </div>

          {/* chase card */}
          <div className="relative mt-[6%] w-[52%] -rotate-3">
            <div className="absolute -inset-2 rounded-xl bg-white/30 blur-md" />
            <div className={`relative aspect-[5/7] overflow-hidden rounded-md border-2 bg-navy-800 shadow-xl ${chaseStyle.border}`}>
              {chase.image ? (
                <img src={chase.image} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover" />
              ) : (
                <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${chaseStyle.gradient}`}>
                  <GameIcon className="h-1/2 w-1/2 text-white/85" />
                </div>
              )}
            </div>
          </div>
          <p className={`mt-[5%] w-full truncate font-semibold uppercase tracking-wide text-white/90 drop-shadow ${big ? 'text-xs' : 'text-[7px]'}`}>
            Chase: {chase.name}
          </p>

          {/* title */}
          <div className="mt-auto">
            <p className={`font-display font-black uppercase leading-none text-white drop-shadow-lg ${big ? 'text-3xl' : 'text-sm'}`}>{pack.gemTier} Pack</p>
            <p className={`mt-1 font-semibold uppercase tracking-widest text-white/80 ${big ? 'text-xs' : 'text-[7px]'}`}>
              {pack.set.replace('Gempack ', '')} · {pack.cardsPerPack} cards
            </p>
          </div>
        </div>

        {packNumber && (
          <span className={`absolute right-[7%] top-[7%] rounded-full bg-navy-950/80 font-display font-bold text-white ring-1 ring-white/40 ${big ? 'px-2.5 py-1 text-base' : 'px-1.5 py-0.5 text-[10px]'}`}>
            #{packNumber}
          </span>
        )}
      </div>
    </div>
  )
}

// The original drawn pack face: game icon, set name and product type
function DrawnPackLabel({ product, big }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
      {product.gemTier ? (
        <span className={`${big ? 'text-7xl' : 'text-4xl'} drop-shadow-lg`}>💎</span>
      ) : (
        <GameIcon game={product.game} className={`${big ? 'h-20 w-20' : 'h-10 w-10'} text-white drop-shadow-lg`} />
      )}
      <span className={`mt-2 font-display font-bold uppercase leading-tight text-white drop-shadow ${big ? 'text-xl' : 'text-[11px]'}`}>
        {product.gemTier ? `${product.gemTier} Pack` : product.set}
      </span>
      <span className={`mt-1 rounded bg-navy-950/50 px-1.5 py-0.5 font-semibold uppercase tracking-wider text-white/90 ${big ? 'text-xs' : 'text-[9px]'}`}>
        {product.gemTier ? product.set.replace('Gempack ', '') : product.kind}
      </span>
    </div>
  )
}

// Official product photo (npm run fetch-covers), laid on top of the drawn pack.
// Transparent cut-outs sit straight on the pack's colours; falls back to the drawn face.
function PackImage({ product, fallback }) {
  const [failed, setFailed] = useState(false)
  if (failed) return fallback
  return (
    <div className="absolute inset-[9%] flex items-center justify-center">
      <img
        src={product.image}
        alt={`${product.name}, official product photo`}
        loading="lazy"
        draggable={false}
        onError={() => setFailed(true)}
        className="max-h-full max-w-full object-contain drop-shadow-[0_10px_18px_rgba(5,10,26,0.55)]"
      />
    </div>
  )
}

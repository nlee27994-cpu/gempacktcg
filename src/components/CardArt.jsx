import { useState } from 'react'
import { RARITY_STYLES, isHolo } from '../lib/rarity'
import { GAME_SHORT } from '../lib/catalog'

// Placeholder art: no licensed images, so cards and packs are drawn with gradients.
const GAME_THEME = {
  Pokémon: { tint: 'from-yellow-300/30 to-red-500/20' },
  'Magic: The Gathering': { tint: 'from-orange-300/25 to-stone-700/30' },
  'One Piece': { tint: 'from-red-400/30 to-sky-500/20' },
}

// Simple inline icons so every platform renders the same thing (font glyphs vary)
export function GameIcon({ game, className }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      {game === 'Pokémon' && (
        <>
          <circle cx="24" cy="24" r="20" />
          <path d="M4 24h13M31 24h13" />
          <circle cx="24" cy="24" r="6" />
        </>
      )}
      {game === 'Magic: The Gathering' && (
        <path d="M24 4l5 15h15l-12 9 5 16-13-10-13 10 5-16L4 19h15z" strokeLinejoin="round" />
      )}
      {game === 'One Piece' && (
        <>
          <circle cx="24" cy="10" r="5" />
          <path d="M24 15v29M14 22h20M8 30c2 8 9 13 16 14 7-1 14-6 16-14" strokeLinecap="round" />
        </>
      )}
    </svg>
  )
}

const GEM_TIER_GRADIENT = {
  Emerald: 'from-emerald-300 via-emerald-500 to-navy-800',
  Amethyst: 'from-amethyst-300 via-amethyst-600 to-navy-800',
  Gold: 'from-gold-300 via-gold-500 to-amethyst-600',
}

export default function CardArt({ product, size = 'md', className = '' }) {
  const r = RARITY_STYLES[product.rarity]
  const theme = GAME_THEME[product.game]
  const isPack = product.type === 'pack'
  const holo = isHolo(product.rarity)
  const big = size === 'lg'

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
              {product.gemTier ? `${GAME_SHORT[product.game]} · ${product.set.replace('Gempack ', '')}` : product.kind}
            </span>
          </div>
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
  const theme = GAME_THEME[product.game]
  return (
    <div className={`relative aspect-[5/7] w-full ${className}`}>
      <div className={`${holo ? 'holo' : ''} relative flex h-full w-full flex-col overflow-hidden rounded-xl border-2 bg-navy-800 p-[6%] ${r.border} ${r.glow}`}>
        <div className={`relative flex flex-1 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br ${r.gradient}`}>
          <div className={`absolute inset-0 bg-gradient-to-tr ${theme.tint}`} />
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

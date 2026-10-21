// Rarity tiers double as the brand's gem palette:
// slate -> emerald -> sapphire -> amethyst -> gold
export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Ultra Rare', 'Secret Rare']

export const RARITY_STYLES = {
  Common: {
    gem: 'Quartz',
    text: 'text-slate-300',
    badge: 'bg-slate-500/15 text-slate-200 ring-slate-400/30',
    border: 'border-slate-500/40',
    glow: '',
    gradient: 'from-slate-600 via-slate-700 to-slate-800',
    dot: 'bg-slate-400',
  },
  Uncommon: {
    gem: 'Emerald',
    text: 'text-emerald-gem',
    badge: 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30',
    border: 'border-emerald-400/50',
    glow: 'shadow-[0_0_18px_rgba(16,217,160,0.25)]',
    gradient: 'from-emerald-500 via-emerald-700 to-navy-800',
    dot: 'bg-emerald-gem',
  },
  Rare: {
    gem: 'Sapphire',
    text: 'text-sapphire-400',
    badge: 'bg-sapphire-500/15 text-sky-300 ring-sky-400/30',
    border: 'border-sapphire-400/60',
    glow: 'shadow-[0_0_22px_rgba(59,130,246,0.35)]',
    gradient: 'from-sapphire-400 via-sapphire-500 to-navy-800',
    dot: 'bg-sapphire-400',
  },
  'Ultra Rare': {
    gem: 'Amethyst',
    text: 'text-amethyst-400',
    badge: 'bg-amethyst-500/15 text-amethyst-300 ring-amethyst-400/40',
    border: 'border-amethyst-400/70',
    glow: 'shadow-[0_0_28px_rgba(155,92,246,0.5)]',
    gradient: 'from-amethyst-400 via-amethyst-600 to-navy-800',
    dot: 'bg-amethyst-400',
  },
  'Secret Rare': {
    gem: 'Gold',
    text: 'text-gold-400',
    badge: 'bg-gold-500/15 text-gold-300 ring-gold-400/50',
    border: 'border-gold-400/80',
    glow: 'shadow-[0_0_36px_rgba(245,185,18,0.55)]',
    gradient: 'from-gold-300 via-gold-500 to-amethyst-600',
    dot: 'bg-gold-400',
  },
}

export const rarityRank = (r) => RARITIES.indexOf(r)
export const isHolo = (r) => rarityRank(r) >= rarityRank('Ultra Rare')

import { RARITY_STYLES } from '../lib/rarity'

export default function RarityBadge({ rarity, prefix }) {
  const s = RARITY_STYLES[rarity]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${s.badge}`}>
      <span className={`h-1.5 w-1.5 rotate-45 ${s.dot}`} />
      {prefix}
      {rarity}
    </span>
  )
}

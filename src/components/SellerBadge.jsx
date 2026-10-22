import { GemMark } from './Logo'

// Official = listed by Gempack staff; Verified = a collector who passed ID verification
export default function SellerBadge({ seller, type, you = false }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-xs">
      <span className="truncate text-slate-300">{you ? 'You' : seller}</span>
      {type === 'Official' ? (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-gem/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-inset ring-emerald-gem/30">
          <GemMark className="h-3 w-3" /> Official
        </span>
      ) : (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300 ring-1 ring-inset ring-sky-400/30">
          ✓ Verified
        </span>
      )}
    </span>
  )
}

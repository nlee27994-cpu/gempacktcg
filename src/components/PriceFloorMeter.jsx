import { formatPrice } from '../lib/format'

// Shows how much of the pack price is protected by the guaranteed floor
export default function PriceFloorMeter({ price, floor, exact = false }) {
  const pct = Math.round((floor / price) * 100)
  return (
    <div className="rounded-xl border border-emerald-gem/30 bg-emerald-gem/5 p-4">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-semibold text-emerald-300">Price floor guarantee</p>
        <p className="font-display text-2xl font-bold text-emerald-gem">{formatPrice(floor)}</p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-navy-700">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-gem to-emerald-400" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-slate-400">
        {exact ? (
          <>
            We hand-built every pack in this drop. The weakest one holds{' '}
            <span className="font-semibold text-slate-200">{formatPrice(floor)}</span> in cards ({pct}% of the {formatPrice(price)}{' '}
            price), so every pack is worth at least that.
          </>
        ) : (
          <>
            You're guaranteed at least <span className="font-semibold text-slate-200">{pct}%</span> of the {formatPrice(price)} pack
            price back in card value. If your pulls come in under the floor, we credit the difference to your Gempack account.
          </>
        )}
      </p>
    </div>
  )
}

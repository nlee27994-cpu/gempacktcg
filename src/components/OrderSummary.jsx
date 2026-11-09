import { formatPrice } from '../lib/format'

export default function OrderSummary({ subtotal, shipping, tax, total, children }) {
  // shipping and tax are null when Shopify works them out at checkout
  const atCheckout = shipping == null
  const rows = atCheckout
    ? [
        ['Subtotal', formatPrice(subtotal)],
        ['Shipping & tax', 'At checkout'],
      ]
    : [
        ['Subtotal', formatPrice(subtotal)],
        ['Shipping', shipping === 0 ? 'Free' : formatPrice(shipping)],
        ['Est. tax', formatPrice(tax)],
      ]
  return (
    <div className="panel h-fit p-5">
      <h2 className="font-semibold">Order summary</h2>
      <dl className="mt-4 space-y-2 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between">
            <dt className="text-slate-400">{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        <div className="flex justify-between border-t border-navy-600 pt-3 text-base font-semibold">
          <dt>{atCheckout ? 'Total so far' : 'Total'}</dt>
          <dd className="font-display text-xl">{formatPrice(total)}</dd>
        </div>
      </dl>
      {shipping > 0 && <p className="mt-2 text-xs text-emerald-300">Add {formatPrice(50 - subtotal)} more for free shipping.</p>}
      {children}
    </div>
  )
}

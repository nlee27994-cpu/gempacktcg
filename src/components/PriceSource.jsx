// Where a product's price comes from: a live market source, Gempack's own pricing, or an estimate
export default function PriceSource({ source }) {
  if (!source) return null
  const tone = source.estimate ? 'border-amber-400/40 text-amber-200' : source.gempack ? 'border-emerald-gem/30 text-emerald-200' : 'border-navy-600 text-slate-400'
  return (
    <p className={`mt-2 rounded-lg border px-3 py-2 text-xs ${tone}`}>
      <span className="font-semibold">{source.estimate ? 'Estimated price. ' : source.gempack ? '' : 'Market price. '}</span>
      {source.label}
      {source.asOf && source.asOf !== 'undated' && `, as of ${source.asOf}`}
      {source.asOf === 'undated' && ' (undated listing)'}.
      {source.note && ` ${source.note}.`}
      {source.url && (
        <>
          {' '}
          <a href={source.url} target="_blank" rel="noreferrer" className="font-semibold text-emerald-300 hover:underline">
            Source ↗
          </a>
        </>
      )}
    </p>
  )
}

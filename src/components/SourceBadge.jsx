const STYLES = {
  Direct: 'bg-emerald-gem/10 text-emerald-300 ring-emerald-gem/30',
  Vendor: 'bg-sky-400/10 text-sky-300 ring-sky-400/30',
  Consignment: 'bg-amethyst-500/10 text-amethyst-300 ring-amethyst-400/30',
}
const ICONS = { Direct: '◆', Vendor: '⇄', Consignment: '✋' }

export default function SourceBadge({ source }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STYLES[source]}`}>
      <span aria-hidden="true">{ICONS[source]}</span>
      {source}
    </span>
  )
}

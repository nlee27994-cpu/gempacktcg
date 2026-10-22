const STYLES = {
  Winning: 'bg-emerald-gem/15 text-emerald-300',
  Outbid: 'bg-rose-500/15 text-rose-300',
  Won: 'bg-gold-400/15 text-gold-300',
  Lost: 'bg-navy-700 text-slate-400',
  Ended: 'bg-navy-700 text-slate-400',
  'Your listing': 'bg-sky-400/15 text-sky-300',
  Sold: 'bg-gold-400/15 text-gold-300',
  Unsold: 'bg-navy-700 text-slate-400',
}

export default function AuctionStatus({ status }) {
  if (!status) return null
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${STYLES[status]}`}>{status}</span>
}

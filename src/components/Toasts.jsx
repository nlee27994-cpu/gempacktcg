import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuctions } from '../context/AuctionContext'

function Toast({ notice, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <div role="status" className="panel flex animate-pop-in items-start gap-3 border-gold-400/40 p-3 text-sm shadow-2xl">
      <span aria-hidden="true">⚖</span>
      <div className="flex-1">
        <p>{notice.text}</p>
        {notice.href && (
          <Link to={notice.href} onClick={onDismiss} className="mt-1 inline-block text-xs font-semibold text-gold-300 hover:underline">
            View auction →
          </Link>
        )}
      </div>
      <button onClick={onDismiss} className="text-slate-500 hover:text-white" aria-label="Dismiss">
        ×
      </button>
    </div>
  )
}

export default function Toasts() {
  const { notices, dismiss } = useAuctions()
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96">
      {notices.map((n) => (
        <div key={n.id} className="pointer-events-auto w-full">
          <Toast notice={n} onDismiss={() => dismiss(n.id)} />
        </div>
      ))}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import Logo from './Logo'
import { useCart } from '../context/CartContext'

const LINKS = [
  { to: '/shop', label: 'Shop' },
  { to: '/shop?type=pack', label: 'Packs' },
  { to: '/shop?type=single', label: 'Singles' },
  { to: '/auctions', label: 'Auctions' },
  { to: '/about', label: 'About' },
]

export default function Navbar() {
  const { count } = useCart()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => setOpen(false), [location])

  const isActive = (to) => {
    const [path, query] = to.split('?')
    if (location.pathname !== path) return false
    return query ? location.search.includes(query) : !location.search.includes('type=')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-navy-700/80 bg-navy-950/85 backdrop-blur-lg">
      <nav className="container-page flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="Gempack TCG home">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive(l.to) ? 'bg-navy-800 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {l.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <Link to="/cart" className="btn-ghost relative px-3" aria-label={`Cart, ${count} items`}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="10" cy="20.5" r="1.3" />
              <circle cx="17.5" cy="20.5" r="1.3" />
            </svg>
            {count > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-400 px-1 text-[11px] font-bold text-navy-950">
                {count}
              </span>
            )}
          </Link>
          <button
            className="btn-ghost px-3 md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Toggle menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <ul className="container-page space-y-1 border-t border-navy-700 pb-4 pt-2 md:hidden">
          {LINKS.map((l) => (
            <li key={l.to}>
              <Link to={l.to} className="block rounded-lg px-3 py-2.5 text-base font-medium text-slate-200 hover:bg-navy-800">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </header>
  )
}

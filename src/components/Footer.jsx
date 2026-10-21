import { Link } from 'react-router-dom'
import Logo from './Logo'

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-navy-700/80 bg-navy-950/80">
      <div className="container-page grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-slate-400">
            Packs and singles for Pokémon, Magic: The Gathering and One Piece. Every pack shows its price floor.
          </p>
        </div>
        <div className="text-sm">
          <p className="label">Shop</p>
          <ul className="space-y-1.5 text-slate-300">
            <li><Link to="/shop?type=pack" className="hover:text-white">Sealed packs</Link></li>
            <li><Link to="/shop?type=single" className="hover:text-white">Singles</Link></li>
            <li><Link to="/consign" className="hover:text-white">Consign your cards</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="label">Company</p>
          <ul className="space-y-1.5 text-slate-300">
            <li><Link to="/about" className="hover:text-white">About & strategy</Link></li>
            <li><Link to="/about#team" className="hover:text-white">Team</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-800 py-4 text-center text-xs text-slate-500">
        Student business demo by Mason Do, Nicholas Lee and Rachel Lim. Mock data only: no real products, payments or orders.
        Card names are trademarks of their respective owners.
      </div>
    </footer>
  )
}

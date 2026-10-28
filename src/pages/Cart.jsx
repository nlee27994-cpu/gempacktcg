import { Link } from 'react-router-dom'
import CardArt from '../components/CardArt'
import OrderSummary from '../components/OrderSummary'
import RarityBadge from '../components/RarityBadge'
import SourceBadge from '../components/SourceBadge'
import { useCart } from '../context/CartContext'
import { useLedger } from '../context/LedgerContext'
import { formatPrice } from '../lib/format'

export default function Cart() {
  const cart = useCart()
  const { items, setQty, remove } = cart
  const { stockFor } = useLedger()

  if (items.length === 0) {
    return (
      <div className="container-page py-24 text-center">
        <p className="text-5xl">🛒</p>
        <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-slate-400">Every pack shows its odds. Go find one worth ripping.</p>
        <Link to="/shop" className="btn-primary mt-8">Browse the shop</Link>
      </div>
    )
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold">Your cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className="panel flex gap-4 p-4">
              <Link to={item.href ?? `/product/${item.id}`} className="w-16 shrink-0 sm:w-20">
                <CardArt product={item} />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link to={item.href ?? `/product/${item.id}`} className="line-clamp-2 font-semibold hover:underline">{item.name}</Link>
                    <p className="text-xs text-slate-400">
                      {item.type === 'pack' ? 'Sealed pack' : item.condition} · {item.seller}
                    </p>
                  </div>
                  <p className="font-display font-bold">{formatPrice(item.price * item.qty)}</p>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <RarityBadge rarity={item.rarity} prefix={item.type === 'pack' ? 'Hit: ' : ''} />
                  <SourceBadge source={item.source} />
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="flex items-center rounded-lg border border-navy-500">
                    <button className="px-2.5 py-1" onClick={() => setQty(item.id, item.qty - 1)} aria-label={`Decrease ${item.name}`}>−</button>
                    <span className="w-7 text-center text-sm tabular-nums">{item.qty}</span>
                    <button className="px-2.5 py-1 disabled:opacity-40" onClick={() => setQty(item.id, item.qty + 1)} disabled={item.qty >= (item.auctionId ? item.stock : stockFor(item.id))} aria-label={`Increase ${item.name}`}>+</button>
                  </div>
                  <button className="text-xs text-slate-400 hover:text-rose-400" onClick={() => remove(item.id)}>Remove</button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <OrderSummary {...cart}>
          <Link to="/checkout" className="btn-primary mt-4 w-full py-3">Checkout</Link>
          <Link to="/shop" className="mt-3 block text-center text-sm text-slate-400 hover:text-white">Continue shopping</Link>
        </OrderSummary>
      </div>
    </div>
  )
}

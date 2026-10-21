import { Link, Navigate } from 'react-router-dom'
import { GemMark } from '../components/Logo'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../lib/format'

export default function OrderConfirmation() {
  const { lastOrder: order } = useCart()
  if (!order) return <Navigate to="/" replace />

  const firstPack = order.items.find((i) => i.type === 'pack')

  return (
    <div className="container-page max-w-2xl py-16 text-center">
      <div className="mx-auto w-fit animate-pop-in">
        <GemMark className="h-20 w-20" />
      </div>
      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">Order confirmed!</h1>
      <p className="mt-2 text-slate-300">
        Thanks, {order.customer.name.split(' ')[0]}. A (pretend) receipt is headed to {order.customer.email}.
      </p>
      <p className="mt-4 inline-block rounded-full bg-navy-800 px-4 py-1.5 font-mono text-sm text-gold-300">Order #{order.number}</p>

      <div className="panel mt-8 p-5 text-left">
        <ul className="space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4">
              <span className="truncate text-slate-300">{i.qty}× {i.name}</span>
              <span>{formatPrice(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-navy-600 pt-3 font-semibold">
          <span>Total paid</span>
          <span className="font-display text-lg">{formatPrice(order.total)}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        {firstPack && (
          <Link to={`/open/${firstPack.id}`} className="btn-gold px-6 py-3">⚡ Rip your {firstPack.kind}</Link>
        )}
        <Link to="/shop" className="btn-ghost px-6 py-3">Keep shopping</Link>
      </div>
      <p className="mt-6 text-xs text-slate-500">This is a demo order. No payment was processed.</p>
    </div>
  )
}

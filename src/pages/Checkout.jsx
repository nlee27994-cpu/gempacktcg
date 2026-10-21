import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import OrderSummary from '../components/OrderSummary'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../lib/format'

const FIELDS = [
  ['name', 'Full name', 'text', 'name', 'sm:col-span-2'],
  ['email', 'Email', 'email', 'email', 'sm:col-span-2'],
  ['address', 'Street address', 'text', 'street-address', 'sm:col-span-2'],
  ['city', 'City', 'text', 'address-level2', ''],
  ['zip', 'ZIP code', 'text', 'postal-code', ''],
]

export default function Checkout() {
  const cart = useCart()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', address: '', city: '', zip: '', card: '4242 4242 4242 4242' })
  const [errors, setErrors] = useState({})
  const [placing, setPlacing] = useState(false)

  if (cart.items.length === 0 && !placing) return <Navigate to="/cart" replace />

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    FIELDS.forEach(([key, label]) => {
      if (!form[key].trim()) errs[key] = `${label} is required`
    })
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setPlacing(true)
    // Pretend to talk to a payment processor
    setTimeout(() => {
      cart.checkout({ name: form.name, email: form.email })
      navigate('/order-confirmed', { replace: true })
    }, 900)
  }

  return (
    <div className="container-page py-10">
      <Link to="/cart" className="text-sm text-slate-400 hover:text-white">← Back to cart</Link>
      <h1 className="mt-2 text-3xl font-bold">Checkout</h1>
      <p className="mt-2 inline-block rounded-lg bg-gold-400/10 px-3 py-1.5 text-xs font-semibold text-gold-300">
        Demo checkout. No real payment is taken and nothing ships.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <form id="checkout" onSubmit={submit} noValidate className="panel grid gap-5 p-6 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Shipping</h2>
          {FIELDS.map(([key, label, type, autoComplete, span]) => (
            <label key={key} className={`block ${span}`}>
              <span className="label">{label}</span>
              <input
                className="input"
                type={type}
                autoComplete={autoComplete}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
              {errors[key] && <span className="mt-1 block text-xs text-rose-400">{errors[key]}</span>}
            </label>
          ))}
          <h2 className="mt-2 font-semibold sm:col-span-2">Payment</h2>
          <label className="block sm:col-span-2">
            <span className="label">Card number (test card prefilled)</span>
            <input className="input font-mono" value={form.card} readOnly />
          </label>
        </form>

        <OrderSummary {...cart}>
          <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto border-t border-navy-600 pt-3 text-xs text-slate-400">
            {cart.items.map((i) => (
              <li key={i.id} className="flex justify-between gap-2">
                <span className="truncate">{i.qty}× {i.name}</span>
                <span>{formatPrice(i.price * i.qty)}</span>
              </li>
            ))}
          </ul>
          <button type="submit" form="checkout" className="btn-primary mt-4 w-full py-3" disabled={placing}>
            {placing ? 'Placing order…' : `Place order · ${formatPrice(cart.total)}`}
          </button>
        </OrderSummary>
      </div>
    </div>
  )
}

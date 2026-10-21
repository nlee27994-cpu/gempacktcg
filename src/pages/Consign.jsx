import { useState } from 'react'
import RarityBadge from '../components/RarityBadge'
import { useConsign } from '../context/ConsignContext'
import { CONDITIONS, GAMES } from '../lib/catalog'
import { formatPrice } from '../lib/format'
import { RARITIES } from '../lib/rarity'

const FEE = 0.12
const EMPTY = {
  sellerName: '',
  email: '',
  game: GAMES[0],
  cardName: '',
  set: '',
  rarity: 'Rare',
  condition: 'Near Mint',
  askingPrice: '',
  notes: '',
}

function validate(f) {
  const errors = {}
  if (!f.sellerName.trim()) errors.sellerName = 'Tell us your name'
  if (!/^\S+@\S+\.\S+$/.test(f.email)) errors.email = 'Enter a valid email'
  if (!f.cardName.trim()) errors.cardName = 'Which card is it?'
  if (!f.set.trim()) errors.set = 'Which set is it from?'
  const price = parseFloat(f.askingPrice)
  if (Number.isNaN(price) || price < 5) errors.askingPrice = 'Minimum consignment price is $5'
  return errors
}

function Field({ label, error, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-rose-400">{error}</span>}
    </label>
  )
}

export default function Consign() {
  const { submissions, submit, withdraw } = useConsign()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [justSubmitted, setJustSubmitted] = useState(null)

  const update = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    if (errors[key]) setErrors((errs) => ({ ...errs, [key]: undefined }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate(form)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const entry = submit({ ...form, askingPrice: parseFloat(form.askingPrice) })
    setJustSubmitted(entry)
    // Keep contact details so collectors can submit several cards in a row
    setForm({ ...EMPTY, sellerName: form.sellerName, email: form.email, game: form.game })
  }

  const asking = parseFloat(form.askingPrice)
  const payout = Number.isNaN(asking) ? null : asking * (1 - FEE)

  return (
    <div className="container-page py-10">
      <div className="max-w-2xl">
        <p className="label text-amethyst-300">Consignment</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Turn your binder into cash</h1>
        <p className="mt-3 text-slate-300">
          Send us a card and we verify it, photograph it and list it in front of serious buyers. You keep{' '}
          {Math.round((1 - FEE) * 100)}% of the sale price.
        </p>
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_340px]">
        <form onSubmit={handleSubmit} noValidate className="panel grid gap-5 p-6 sm:grid-cols-2">
          <Field label="Your name" error={errors.sellerName}>
            <input className="input" value={form.sellerName} onChange={update('sellerName')} autoComplete="name" />
          </Field>
          <Field label="Email" error={errors.email}>
            <input className="input" type="email" value={form.email} onChange={update('email')} autoComplete="email" />
          </Field>
          <Field label="Game">
            <select className="input" value={form.game} onChange={update('game')}>
              {GAMES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Card name" error={errors.cardName}>
            <input className="input" value={form.cardName} onChange={update('cardName')} placeholder="e.g. Charizard ex" />
          </Field>
          <Field label="Set" error={errors.set}>
            <input className="input" value={form.set} onChange={update('set')} placeholder="e.g. Obsidian Flames" />
          </Field>
          <Field label="Rarity">
            <select className="input" value={form.rarity} onChange={update('rarity')}>
              {RARITIES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Condition">
            <select className="input" value={form.condition} onChange={update('condition')}>
              {CONDITIONS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Asking price (USD)" error={errors.askingPrice}>
            <input className="input" type="number" min="5" step="0.01" inputMode="decimal" value={form.askingPrice} onChange={update('askingPrice')} placeholder="25.00" />
          </Field>
          <Field label="Notes (optional)" className="sm:col-span-2">
            <textarea className="input min-h-[90px]" value={form.notes} onChange={update('notes')} placeholder="Centering, whitening, grading history…" />
          </Field>

          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Estimated payout:{' '}
              <span className="font-display text-lg font-bold text-emerald-gem">{payout ? formatPrice(payout) : '—'}</span>
              <span className="ml-1 text-xs">after {FEE * 100}% fee</span>
            </p>
            <button type="submit" className="btn-primary px-8 py-3">Submit card</button>
          </div>

          {justSubmitted && (
            <p role="status" className="rounded-xl border border-emerald-gem/40 bg-emerald-gem/10 p-3 text-sm text-emerald-200 sm:col-span-2">
              ✓ <span className="font-semibold">{justSubmitted.cardName}</span> was submitted. We'll email {justSubmitted.email} with a
              prepaid shipping label (demo only, nothing is sent).
            </p>
          )}
        </form>

        <aside className="space-y-4">
          <div className="panel p-5">
            <h2 className="font-semibold">How it works</h2>
            <ol className="mt-3 space-y-3 text-sm text-slate-300">
              {[
                'Submit your card and asking price.',
                'Ship it to us free with our prepaid label.',
                'We verify condition and list it with a Consignment badge.',
                'It sells, and you get paid within 3 business days.',
              ].map((step, i) => (
                <li key={step} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amethyst-500/20 text-xs font-bold text-amethyst-300">{i + 1}</span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          <div className="panel p-5">
            <h2 className="font-semibold">Your submissions ({submissions.length})</h2>
            {submissions.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">Nothing yet. Cards you submit show up here.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {submissions.map((s) => (
                  <li key={s.id} className="rounded-lg bg-navy-950/60 p-3 ring-1 ring-navy-600">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{s.cardName}</p>
                        <p className="truncate text-xs text-slate-400">
                          {s.set} · {s.condition}
                        </p>
                      </div>
                      <p className="font-display font-bold">{formatPrice(s.askingPrice)}</p>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <RarityBadge rarity={s.rarity} />
                      <span className="text-[11px] font-semibold text-gold-300">● {s.status}</span>
                    </div>
                    <button onClick={() => withdraw(s.id)} className="mt-2 text-xs text-slate-500 hover:text-rose-400">
                      Withdraw
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-slate-500">Stored in this browser session only. Refreshing clears it.</p>
          </div>
        </aside>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { GemMark } from '../components/Logo'

const TEAM = [
  { name: 'Mason Do', initials: 'MD', color: 'from-emerald-gem to-emerald-700' },
  { name: 'Nicholas Lee', initials: 'NL', color: 'from-amethyst-400 to-amethyst-600' },
  { name: 'Rachel Lim', initials: 'RL', color: 'from-gold-300 to-gold-600' },
]

const STRATEGY = [
  {
    title: 'Who we serve',
    color: 'text-emerald-gem',
    body: 'Everyday Pokémon card fans who already spend a lot on the hobby. They care more about price than art, and they love the thrill of the pull.',
  },
  {
    title: 'What makes us different',
    color: 'text-amethyst-300',
    body: 'Every pack lists a price floor: the minimum card value you are guaranteed. If your pulls land below it, we credit the difference. You get the excitement without the feeling of getting ripped off.',
  },
  {
    title: 'Three sources, one cart',
    color: 'text-sky-300',
    body: 'We sell our own stock directly, list inventory from partner vendors, and take consignments from collectors. More supply means better prices and more singles to choose from.',
  },
  {
    title: 'How we make money',
    color: 'text-gold-300',
    body: 'Retail margin on direct sales, a commission on vendor listings, and a 12% fee on consigned cards. Curated Gempack Mystery Packs are our highest-margin signature product.',
  },
  {
    title: 'How we grow',
    color: 'text-emerald-gem',
    body: 'Live rip showcases and set-release events bring fans together. Featured rare-card drops give collectors a reason to come back every day.',
  },
  {
    title: 'Where we start',
    color: 'text-amethyst-300',
    body: 'Pokémon first, because it has the biggest and most engaged audience. Magic: The Gathering and One Piece round out the catalog for collectors who play more than one game.',
  },
]

export default function About() {
  return (
    <div className="container-page py-12">
      <section className="mx-auto max-w-3xl text-center">
        <GemMark className="mx-auto h-16 w-16" />
        <p className="label mt-6 text-gold-400">Our mission</p>
        <h1 className="text-3xl font-bold leading-tight sm:text-5xl">
          Sell cards to <span className="gem-text">Pokémon card enjoyers</span>, direct or through other vendors.
        </h1>
        <p className="mt-6 text-lg text-slate-300">
          Gempack TCG is one marketplace for sealed packs and singles across Pokémon, Magic: The Gathering and One Piece. We
          built it around one promise: every pack you buy should feel fair.
        </p>
      </section>

      <section id="team" className="mt-20 scroll-mt-24">
        <h2 className="text-center text-3xl font-bold">The team</h2>
        <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-3">
          {TEAM.map((m) => (
            <div key={m.name} className="panel p-6 text-center">
              <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br ${m.color} font-display text-2xl font-bold text-navy-950`}>
                {m.initials}
              </div>
              <p className="mt-4 font-semibold">{m.name}</p>
              <p className="text-sm text-slate-400">Co-founder</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="text-center text-3xl font-bold">Our strategy</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STRATEGY.map((s) => (
            <div key={s.title} className="panel p-6">
              <h3 className={`text-lg font-semibold ${s.color}`}>{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <div className="panel mx-auto max-w-3xl p-6 sm:p-8">
          <h2 className="text-2xl font-bold">How the price floor works</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-300">
            <li><span className="font-semibold text-white">1. We set the floor</span> from current market prices and the pack's pull odds, and print it on the listing.</li>
            <li><span className="font-semibold text-white">2. You rip.</span> Every card you pull is valued at its near-mint market price.</li>
            <li><span className="font-semibold text-white">3. If the total is under the floor,</span> we credit the difference to your Gempack account automatically.</li>
          </ol>
          <Link to="/shop?type=pack&sort=floor" className="btn-primary mt-6">See packs with the best floors</Link>
        </div>
      </section>
    </div>
  )
}

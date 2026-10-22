// Generates the mock catalog in src/data/*.json.
// Deterministic (seeded PRNG), so re-running produces the same files.
// Usage: npm run generate-data
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPackEngine, solveFloor } from '../src/lib/packEngine.js'
import { bidIncrement, CONDITION_VALUE } from '../src/lib/auction.js'

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')

// ---------- seeded random helpers ----------
function mulberry32(seed) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20261021)
const between = (min, max) => min + rand() * (max - min)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const weighted = (entries) => {
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = rand() * total
  for (const [value, w] of entries) {
    if ((r -= w) < 0) return value
  }
  return entries[entries.length - 1][0]
}
const money = (n) => Math.round(n * 100) / 100
// Prices that look like real shelf prices: 4.99, 12.49 ...
const shelf = (n) => (n < 1 ? money(n) : Math.max(0.99, Math.round(n) - 0.01))

// ---------- reference data ----------
const SETS = {
  Pokémon: [
    'Prismatic Evolutions', 'Surging Sparks', 'Stellar Crown', 'Twilight Masquerade',
    'Scarlet & Violet 151', 'Obsidian Flames', 'Paldean Fates', 'Temporal Forces',
    'Journey Together', 'Destined Rivals', 'Shrouded Fable',
  ],
  'Magic: The Gathering': [
    'Bloomburrow', 'Duskmourn', 'Foundations', 'Aetherdrift',
    'Tarkir: Dragonstorm', 'Final Fantasy', 'Edge of Eternities',
  ],
  'One Piece': [
    'Romance Dawn (OP-01)', 'Awakening of the New Era (OP-05)', 'Wings of the Captain (OP-06)',
    '500 Years in the Future (OP-07)', 'Two Legends (OP-08)', 'Emperors in the New World (OP-09)',
    'Memorial Collection (EB-01)',
  ],
}

const VENDORS = {
  Pokémon: ['Kanto Card Co.', 'Stadium Cards', 'PalletTown Collectibles'],
  'Magic: The Gathering': ['Blue Mana Games', 'Planeswalker Supply', 'Stadium Cards'],
  'One Piece': ['Grand Line Collectibles', 'Thousand Sunny Cards', 'Stadium Cards'],
}
const COLLECTORS = [
  '@ripking22', '@holo_hunter', '@mintcondition_mia', '@sleevedup', '@pullrate_pete',
  '@gradedgabe', '@binderbrooke', '@topdeck_tay',
]

const GAME_SLUG = { Pokémon: 'pokemon', 'Magic: The Gathering': 'mtg', 'One Piece': 'onepiece' }

const sellerFor = (game, source) =>
  source === 'Direct' ? 'Gempack TCG' : source === 'Vendor' ? pick(VENDORS[game]) : pick(COLLECTORS)

// [name, rarity, optional fixed NM market price, optional set]
const C = 'Common', U = 'Uncommon', R = 'Rare', UR = 'Ultra Rare', SR = 'Secret Rare'
const CARDS = {
  Pokémon: [
    ['Umbreon ex', SR, 1149, 'Prismatic Evolutions'],
    ['Pikachu ex', SR, 389, 'Surging Sparks'],
    ['Charizard ex', SR, 249, 'Scarlet & Violet 151'],
    ['Sylveon ex', SR, 189, 'Prismatic Evolutions'],
    ['Espeon ex', SR, 229, 'Prismatic Evolutions'],
    ['Terapagos ex', SR, 119, 'Stellar Crown'],
    ['Mew ex', SR, 89, 'Scarlet & Violet 151'],
    ['Charizard ex (Shiny)', SR, 139, 'Paldean Fates'],
    ['Latias ex', SR, 159, 'Surging Sparks'],
    ['Team Rocket\'s Mewtwo ex', SR, 299, 'Destined Rivals'],
    ['Greninja ex', UR, 64, 'Twilight Masquerade'],
    ['Gardevoir ex', UR, 22],
    ['Iron Valiant ex', UR, 14],
    ['Roaring Moon ex', UR, 18, 'Temporal Forces'],
    ['Walking Wake ex', UR, 16, 'Temporal Forces'],
    ['Dragapult ex', UR, 31],
    ['Zapdos ex', UR, 19, 'Scarlet & Violet 151'],
    ['Lillie\'s Clefairy ex', UR, 42, 'Journey Together'],
    ['Ogerpon ex', UR, 27, 'Twilight Masquerade'],
    ['Pecharunt ex', UR, 12, 'Shrouded Fable'],
    ['Snorlax', R], ['Gengar', R], ['Lucario', R], ['Eevee', R], ['Dragonite', R],
    ['Gyarados', R], ['Alakazam', R], ['Tyranitar', R], ['Ceruledge', R],
    ['Pikachu', U], ['Ditto', U], ['Jigglypuff', U], ['Psyduck', U], ['Growlithe', U],
    ['Machoke', U], ['Haunter', U], ['Kadabra', U], ['Togepi', U],
    ['Bulbasaur', C], ['Charmander', C], ['Squirtle', C], ['Caterpie', C], ['Pidgey', C],
    ['Rattata', C], ['Magikarp', C], ['Zubat', C], ['Oddish', C], ['Sprigatito', C],
  ],
  'Magic: The Gathering': [
    ['The One Ring (Borderless)', SR, 129],
    ['Maha, Its Feathers Night', SR, 34, 'Bloomburrow'],
    ['Overlord of the Hauntwoods', SR, 46, 'Duskmourn'],
    ['Cloud, Midgar Mercenary (Surge Foil)', SR, 89, 'Final Fantasy'],
    ['Sephiroth, Fabled SOLDIER', SR, 74, 'Final Fantasy'],
    ['Sunderflock (Showcase)', SR, 28],
    ['Ygra, Eater of All', UR, 18, 'Bloomburrow'],
    ['Valley Questcaller', UR, 12, 'Bloomburrow'],
    ['Enduring Innocence', UR, 9, 'Duskmourn'],
    ['Leyline of the Void', UR, 16, 'Duskmourn'],
    ['Sheoldred, the Apocalypse', UR, 62, 'Foundations'],
    ['Elesh Norn (Borderless)', UR, 24, 'Tarkir: Dragonstorm'],
    ['Lightning Bolt', R, 3.5], ['Counterspell', R, 2.75], ['Llanowar Elves', R],
    ['Mabel\'s Mettle', R], ['Vren, the Relentless', R], ['Pawpatch Recruit', R],
    ['Doomsday Excruciator', R], ['Cavern-Hoard Dragon', R],
    ['Shock', U], ['Heartfire Hero', U], ['Thought Shucker', U], ['Fear of Missing Out', U],
    ['Unholy Annex', U], ['Gloom Ripper', U], ['Brightblade Stoat', U],
    ['Island', C, 0.15], ['Forest', C, 0.15], ['Mountain', C, 0.15], ['Plains', C, 0.15], ['Swamp', C, 0.15],
    ['Fell', C], ['Lilypad Village', C], ['Bandit\'s Talent', C],
  ],
  'One Piece': [
    ['Monkey.D.Luffy (Manga Rare)', SR, 349, 'Wings of the Captain (OP-06)'],
    ['Roronoa Zoro (Alt Art)', SR, 129, 'Romance Dawn (OP-01)'],
    ['Shanks (Manga Rare)', SR, 219, 'Two Legends (OP-08)'],
    ['Boa Hancock (Alt Art)', SR, 84, '500 Years in the Future (OP-07)'],
    ['Portgas.D.Ace (SP)', SR, 109, 'Memorial Collection (EB-01)'],
    ['Marshall.D.Teach (Alt Art)', SR, 66, 'Emperors in the New World (OP-09)'],
    ['Trafalgar Law (SEC)', UR, 38],
    ['Nami (SR)', UR, 21],
    ['Yamato (SR)', UR, 26, 'Awakening of the New Era (OP-05)'],
    ['Kaido (Leader Parallel)', UR, 33],
    ['Sabo (SR)', UR, 17, 'Awakening of the New Era (OP-05)'],
    ['Eustass Kid (SR)', UR, 14],
    ['Sanji', R], ['Nico Robin', R], ['Tony Tony.Chopper', R], ['Usopp', R],
    ['Franky', R], ['Brook', R], ['Jinbe', R], ['Kozuki Oden', R],
    ['Koby', U], ['Buggy', U], ['Smoker', U], ['Perona', U], ['Crocodile', U],
    ['Arlong', U], ['Bartolomeo', U],
    ['Marine Soldier', C], ['Straw Hat Crew Member', C], ['Baroque Works Agent', C],
    ['Going Merry', C], ['Gum-Gum Pistol', C], ['Thousand Sunny', C], ['Den Den Mushi', C],
  ],
}

const NM_RANGE = { [C]: [0.05, 0.35], [U]: [0.1, 0.9], [R]: [0.5, 4], [UR]: [8, 40], [SR]: [40, 200] }
const CONDITION_MULT = CONDITION_VALUE

// ---------- singles ----------
const singles = []
let sIdx = 1
for (const [game, cards] of Object.entries(CARDS)) {
  for (const [name, rarity, fixedPrice, fixedSet] of cards) {
    const set = fixedSet ?? pick(SETS[game])
    const marketPrice = money(fixedPrice ?? between(...NM_RANGE[rarity]))
    const gradeable = rarity === UR || rarity === SR
    const condition = weighted(
      gradeable
        ? [['Near Mint', 55], ['Lightly Played', 10], ['PSA 9', 20], ['PSA 10', 15]]
        : [['Near Mint', 70], ['Lightly Played', 20], ['Moderately Played', 10]],
    )
    const source = weighted([['Direct', 30], ['Vendor', 35], ['Collector', 35]])
    const price = shelf(marketPrice * CONDITION_MULT[condition] * between(0.95, 1.08))
    singles.push({
      id: `sg-${String(sIdx++).padStart(3, '0')}`,
      type: 'single',
      name,
      game,
      set,
      number: `${String(Math.floor(between(1, 240))).padStart(3, '0')}`,
      rarity,
      condition,
      price,
      marketPrice,
      source,
      seller: sellerFor(game, source),
      stock: source === 'Collector' ? 1 : Math.ceil(between(1, rarity === SR ? 2 : 12)),
      featured: rarity === SR && marketPrice >= 120,
    })
  }
}

// ---------- packs ----------
// rarity on a pack = the guaranteed minimum "hit" rarity
const PACK_TYPES = {
  Pokémon: [
    { kind: 'Booster Pack', base: 5.49, cards: 10, hit: R, hitSlots: 1 },
    { kind: 'Sleeved Booster', base: 5.99, cards: 10, hit: R, hitSlots: 1 },
    { kind: '3-Pack Blister', base: 15.99, cards: 30, hit: R, hitSlots: 3 },
    { kind: 'Premium Graded-Hit Pack', base: 34.99, cards: 10, hit: UR, hitSlots: 1 },
  ],
  'Magic: The Gathering': [
    { kind: 'Play Booster', base: 5.99, cards: 14, hit: R, hitSlots: 1 },
    { kind: 'Collector Booster', base: 27.99, cards: 15, hit: UR, hitSlots: 1 },
    { kind: 'Sleeved Play Booster', base: 6.49, cards: 14, hit: R, hitSlots: 1 },
    { kind: 'Prerelease Pack', base: 29.99, cards: 36, hit: R, hitSlots: 6 },
  ],
  'One Piece': [
    { kind: 'Booster Pack', base: 4.99, cards: 12, hit: R, hitSlots: 1 },
    { kind: 'Booster Pack (Japanese)', base: 6.99, cards: 6, hit: R, hitSlots: 1 },
    { kind: 'Tournament Pack', base: 12.99, cards: 12, hit: R, hitSlots: 2 },
    { kind: 'Premium Booster', base: 24.99, cards: 6, hit: UR, hitSlots: 1 },
  ],
}

// Chase sets command a premium on the shelf
const SET_HEAT = {
  'Prismatic Evolutions': 2.1, 'Scarlet & Violet 151': 1.6, 'Surging Sparks': 1.25,
  'Destined Rivals': 1.4, 'Final Fantasy': 1.7, 'Wings of the Captain (OP-06)': 1.5,
  'Romance Dawn (OP-01)': 1.8, 'Memorial Collection (EB-01)': 1.4,
}

const packs = []
let pIdx = 1
const pushPack = (p) => packs.push({ id: `pk-${String(pIdx++).padStart(3, '0')}`, type: 'pack', condition: 'Sealed', ...p })

for (const [game, sets] of Object.entries(SETS)) {
  for (const set of sets) {
    for (const t of PACK_TYPES[game]) {
      const heat = SET_HEAT[set] ?? between(0.9, 1.15)
      const price = shelf(t.base * heat * between(0.97, 1.06))
      const source = weighted([['Direct', 45], ['Vendor', 40], ['Collector', 15]])
      pushPack({
        name: `${set} ${t.kind}`,
        game,
        set,
        kind: t.kind,
        rarity: t.hit,
        price,
        cardsPerPack: t.cards,
        hitSlots: t.hitSlots,
        source,
        seller: sellerFor(game, source),
        stock: Math.ceil(between(source === 'Collector' ? 1 : 6, source === 'Collector' ? 4 : 60)),
        featured: false,
      })
    }
  }
}

// ---------- Gempack Series drops ----------
// Our hand-built packs. Each tier is a numbered drop with a fixed print run and a public
// checklist: every card on the checklist is sealed into exactly one pack, so whoever opens
// every pack in the drop gets every card.
const SERIES_NAME = 'Gempack Series 1'
const SERIES_TIERS = [
  { tier: 'Emerald', price: 29.99, hitSlots: 1, packCount: 60 },
  { tier: 'Amethyst', price: 59.99, hitSlots: 2, packCount: 30 },
  { tier: 'Gold', price: 149.99, hitSlots: 3, packCount: 20 },
]
const SERIES_CARDS_PER_PACK = 5
const SERIES_PAYOUT = 0.9 // total card value in a drop = 90% of what the drop sells for
const FILLER_MIX = [[C, 0.55], [U, 0.3], [R, 0.15]]
// Scarcer copies for pricier chase cards
const maxCopies = (card) => (card.marketPrice >= 500 ? 1 : card.marketPrice >= 150 ? 2 : 3)

const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const sumValue = (cards) => cards.reduce((s, c) => s + c.marketPrice, 0)
const byPrice = (a, b) => a.marketPrice - b.marketPrice

function buildSeries(game, t) {
  const pool = (rarity) => singles.filter((s) => s.game === game && s.rarity === rarity).sort(byPrice)
  const fillerPerPack = SERIES_CARDS_PER_PACK - t.hitSlots
  const fillerTotal = t.packCount * fillerPerPack
  const hitTotal = t.packCount * t.hitSlots

  // Filler copies, spread round-robin over each tier's cards
  const fillers = []
  FILLER_MIX.forEach(([rarity, share], i) => {
    const n = i === FILLER_MIX.length - 1 ? fillerTotal - fillers.length : Math.round(fillerTotal * share)
    const cards = shuffle(pool(rarity))
    for (let k = 0; k < n; k++) fillers.push(cards[k % cards.length])
  })

  // Hits start as the cheaper Ultra Rares, then get upgraded while the value budget allows
  const budget = t.price * t.packCount * SERIES_PAYOUT - sumValue(fillers)
  const urs = pool(UR)
  const srs = pool(SR)
  const cheapUrs = urs.slice(0, Math.ceil(urs.length / 2))
  const hits = Array.from({ length: hitTotal }, (_, i) => cheapUrs[i % cheapUrs.length])
  let value = sumValue(hits)
  const copiesOf = (card) => hits.filter((h) => h.id === card.id).length
  // Swap the cheapest hit for `card` if it fits the budget
  const tryUpgrade = (card, eligible) => {
    const target = hits.filter(eligible).sort(byPrice)[0]
    if (!target) return false
    const delta = card.marketPrice - target.marketPrice
    if (delta <= 0 || value + delta > budget) return false
    hits[hits.indexOf(target)] = card
    value += delta
    return true
  }
  // Small card pools (e.g. MTG) can run out of copies before the budget is spent,
  // so copy limits loosen step by step until the drop holds its share of value.
  for (let scale = 1; scale <= 4 && value < budget * 0.97; scale++) {
    // 1) Chase cards: biggest Secret Rare that fits goes in first
    for (let changed = true; changed; ) {
      changed = false
      for (const sr of [...srs].reverse()) {
        if (copiesOf(sr) < maxCopies(sr) * scale) changed = tryUpgrade(sr, (h) => h.rarity === UR) || changed
      }
    }
    // 2) Spend what's left upgrading cheap Ultra Rares to pricier ones
    const urCap = (Math.ceil(hitTotal / urs.length) + 2) * scale
    for (let changed = true; changed; ) {
      changed = false
      for (const ur of [...urs].reverse()) {
        if (copiesOf(ur) < urCap) changed = tryUpgrade(ur, (h) => h.rarity === UR && h.marketPrice < ur.marketPrice) || changed
      }
    }
  }

  // Seal the packs: biggest cards first, each into the weakest pack with room,
  // so the worst pack in the drop is as strong as possible. That worst pack is the floor.
  const sealed = Array.from({ length: t.packCount }, () => ({ hits: [], fillers: [], value: 0 }))
  const place = (cards, slot, cap) => {
    for (const card of [...cards].sort(byPrice).reverse()) {
      const target = sealed.filter((p) => p[slot].length < cap).sort((a, b) => a.value - b.value)[0]
      target[slot].push(card)
      target.value += card.marketPrice
    }
  }
  place(hits, 'hits', t.hitSlots)
  place(fillers, 'fillers', fillerPerPack)

  const counts = new Map()
  for (const c of [...hits, ...fillers]) counts.set(c.id, (counts.get(c.id) ?? 0) + 1)
  const rank = [C, U, R, UR, SR]
  const checklist = [...counts]
    .map(([id, copies]) => ({ id, copies, card: singles.find((s) => s.id === id) }))
    .sort((a, b) => rank.indexOf(b.card.rarity) - rank.indexOf(a.card.rarity) || b.card.marketPrice - a.card.marketPrice)
    .map(({ id, copies }) => ({ id, copies }))

  return {
    checklist,
    packs: shuffle(sealed).map((p) => [...p.fillers.sort(byPrice), ...p.hits.sort(byPrice)].map((c) => c.id)),
    totalValue: money(value + sumValue(fillers)),
    priceFloor: Math.floor(Math.min(...sealed.map((p) => p.value)) * 100) / 100,
  }
}

const series = []
for (const game of Object.keys(SETS)) {
  for (const t of SERIES_TIERS) {
    const built = buildSeries(game, t)
    const id = `sr-${t.tier.toLowerCase()}-${GAME_SLUG[game]}`
    pushPack({
      name: `Gempack ${t.tier} Pack — ${game}`,
      game,
      set: SERIES_NAME,
      kind: `${t.tier} Series Pack`,
      rarity: UR,
      price: t.price,
      priceFloor: built.priceFloor,
      cardsPerPack: SERIES_CARDS_PER_PACK,
      hitSlots: t.hitSlots,
      source: 'Direct',
      seller: 'Gempack TCG',
      stock: t.packCount,
      featured: true,
      gemTier: t.tier,
      seriesId: id,
    })
    series.push({ id, packId: packs.at(-1).id, name: `${SERIES_NAME}: ${t.tier} — ${game}`, game, tier: t.tier, ...built })
  }
}

// ---------- price floors ----------
// Store packs: floors come from simulated pulls, set as the highest floor whose expected
// store-credit payout stays under 6% of the price. Series packs already have exact floors.
const engine = createPackEngine(singles)
packs.forEach((p, i) => {
  if (!p.seriesId) p.priceFloor = solveFloor(engine, p, 0.06, 1500, 1000 + i)
})

// ---------- auction house ----------
// Live listings from Gempack (official) and verified collectors. End times are stored as
// minutes from when the visitor first opens the site, so countdowns are always live.
const BIDDERS = ['@pullrate_pete', '@holo_hunter', '@sleevedup', '@binderbrooke', '@topdeck_tay', '@gradedgabe', '@ripking22', '@mintcondition_mia', '@cardboardcrack', '@nm_or_bust']
const auctionCards = shuffle(singles.filter((c) => c.rarity !== C && c.marketPrice >= 2)).slice(0, 36)
const auctions = auctionCards.map((card, i) => {
  const official = rand() < 0.3
  const seller = official ? 'Gempack TCG' : pick(COLLECTORS)
  const gradeable = card.rarity === UR || card.rarity === SR
  const condition = weighted(gradeable ? [['Near Mint', 55], ['PSA 9', 25], ['PSA 10', 20]] : [['Near Mint', 75], ['Lightly Played', 25]])
  const value = card.marketPrice * CONDITION_MULT[condition]
  const startPrice = Math.max(0.99, shelf(value * between(0.35, 0.7)))
  const buyNow = rand() < 0.8 ? shelf(value * between(1.05, 1.3)) : null
  // Bid history climbs from the start price by at least one increment per bid
  const target = value * between(0.55, 0.95)
  const history = []
  let bid = startPrice
  const wanted = Math.floor(between(0, 14))
  for (let k = 0; k < wanted && bid < target && (!buyNow || bid + bidIncrement(bid) < buyNow); k++) {
    if (k > 0) bid = money(bid + bidIncrement(bid) * Math.ceil(between(1, 3)))
    if (buyNow && bid >= buyNow) break
    history.push({ bidder: pick(BIDDERS.filter((b) => b !== seller && b !== history.at(-1)?.bidder)), amount: bid })
  }
  // Mix of auctions about to end, ending today, and ending in a few days
  const endsInMinutes = Math.round(
    weighted([['soon', 25], ['today', 35], ['later', 40]]) === 'soon' ? between(2, 15) : rand() < 0.45 ? between(15, 360) : between(360, 4320),
  )
  const span = endsInMinutes + between(30, 600)
  return {
    id: `au-${String(i + 1).padStart(3, '0')}`,
    cardId: card.id,
    condition,
    seller,
    sellerType: official ? 'Official' : 'Verified',
    startPrice,
    buyNow,
    currentBid: history.at(-1)?.amount ?? 0,
    bidCount: history.length,
    endsInMinutes,
    // Simulated rival bidders stop around what the card is worth
    botCeiling: money(value * between(0.9, 1.15)),
    // minutesAgo counts down toward now, so the newest bid is the most recent
    history: history.map((h, k) => ({ ...h, minutesAgo: Math.round(span * (1 - (k + 1) / (history.length + 1))) })).reverse(),
  }
})

// ---------- events ----------
const events = [
  { id: 'ev-1', title: 'Live Rip Showcase: Prismatic Evolutions', type: 'Live Showcase', date: '2026-10-30T19:00:00-07:00', location: 'Livestream · Gempack TV', game: 'Pokémon', blurb: 'We open 36 packs on stream. Every pull is listed in the shop within the hour.' },
  { id: 'ev-2', title: 'One Piece OP-13 Release Night', type: 'Set Release', date: '2026-11-07T17:00:00-07:00', location: 'Partner store: Grand Line Collectibles', game: 'One Piece', blurb: 'Midnight-style release with sealed pre-orders, a Leader draft and prizes.' },
  { id: 'ev-3', title: 'Magic Prerelease Weekend', type: 'Set Release', date: '2026-11-14T10:00:00-07:00', location: 'Partner store: Blue Mana Games', game: 'Magic: The Gathering', blurb: 'Sealed prerelease events all weekend. Prerelease Packs ship with a price floor.' },
  { id: 'ev-4', title: 'Collector Auction Day', type: 'Community', date: '2026-11-21T12:00:00-08:00', location: 'Gempack HQ + online', game: 'All games', blurb: 'Bring your binder. Get verified on the spot and list your best cards in the Auction House.' },
  { id: 'ev-5', title: 'Holiday Gold Pack Drop', type: 'Live Showcase', date: '2026-12-12T18:00:00-08:00', location: 'Livestream · Gempack TV', game: 'All games', blurb: 'Series 2 opens: new Emerald, Amethyst and Gold drops with a fresh checklist of chase cards.' },
]

mkdirSync(OUT, { recursive: true })
const write = (file, data) => writeFileSync(join(OUT, file), JSON.stringify(data, null, 2) + '\n')
write('singles.json', singles)
write('packs.json', packs)
write('events.json', events)
write('series.json', series)
write('auctions.json', auctions)
console.log(`Wrote ${singles.length} singles, ${packs.length} packs, ${series.length} series, ${auctions.length} auctions, ${events.length} events to src/data`)

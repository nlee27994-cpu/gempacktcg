// Generates the mock catalog in src/data/*.json.
// Deterministic (seeded PRNG), so re-running produces the same files.
// Usage: npm run generate-data
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bidIncrement, CONDITION_VALUE } from '../src/lib/auction.js'
import { PACK_PRICES } from './market-prices.mjs'
import { IMAGE_DIR, imageFileFor } from './fetch-images.mjs'
import { COVER_DIR, coverFileFor } from './fetch-covers.mjs'
import { PACK_COVERS, coverIdFor } from './pack-covers.mjs'

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
}

const VENDORS = {
  Pokémon: ['Kanto Card Co.', 'Stadium Cards', 'PalletTown Collectibles'],
}
const COLLECTORS = [
  '@ripking22', '@holo_hunter', '@mintcondition_mia', '@sleevedup', '@pullrate_pete',
  '@gradedgabe', '@binderbrooke', '@topdeck_tay',
]


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
}

const estimate = (label) => ({ label, estimate: true })

// Real cards with live market prices, if the sync script has been run
// (npm run sync:pokemon). Otherwise the built-in list below is used.
const SNAPSHOTS = [['Pokémon', 'pokemon-api.json', 'TCGplayer market price via the Pokémon TCG API']]
for (const [game, file, label] of SNAPSHOTS) {
  const path = join(OUT, file)
  if (!existsSync(path)) continue
  const snapshot = JSON.parse(readFileSync(path, 'utf8'))
  // Tiers the snapshot doesn't cover keep the built-in (estimated) cards
  const covered = new Set(snapshot.cards.map((c) => c.rarity))
  const builtIn = CARDS[game].filter(([, rarity]) => !covered.has(rarity))
  CARDS[game] = snapshot.cards.map(({ name, rarity, marketPrice, set, ...api }) => [
    name,
    rarity,
    marketPrice,
    set,
    { ...api, priceSource: { label, url: api.tcgplayerUrl, asOf: api.priceUpdatedAt } },
  ])
  CARDS[game].push(...builtIn)
  console.log(`Using ${snapshot.cards.length} real ${game} cards from ${file} (synced ${snapshot.syncedAt})`)
}

const NM_RANGE = { [C]: [0.05, 0.35], [U]: [0.1, 0.9], [R]: [0.5, 4], [UR]: [8, 40], [SR]: [40, 200] }
const CONDITION_MULT = CONDITION_VALUE

// ---------- singles ----------
const singles = []
let sIdx = 1
for (const [game, cards] of Object.entries(CARDS)) {
  for (const [name, rarity, fixedPrice, fixedSet, api] of cards) {
    const set = fixedSet ?? pick(SETS[game])
    const marketPrice = money(fixedPrice ?? between(...NM_RANGE[rarity]))
    // Raw copies only: graded (PSA) prices vary too much per card to estimate honestly
    const condition = weighted([['Near Mint', 72], ['Lightly Played', 20], ['Moderately Played', 8]])
    const source = weighted([['Direct', 30], ['Vendor', 35], ['Collector', 35]])
    // Listed at market value for the condition: no invented markups
    const price = money(marketPrice * CONDITION_MULT[condition])
    singles.push({
      id: `sg-${String(sIdx++).padStart(3, '0')}`,
      type: 'single',
      name,
      game,
      set,
      number: api?.number ?? `${String(Math.floor(between(1, 240))).padStart(3, '0')}`,
      rarity,
      condition,
      price,
      marketPrice,
      source,
      seller: sellerFor(game, source),
      stock: source === 'Collector' ? 1 : Math.ceil(between(1, rarity === SR ? 2 : 12)),
      featured: rarity === SR && marketPrice >= 120,
      priceSource: api?.priceSource ?? estimate('Estimate: no live price source for this card yet'),
      // Real-card details from a card API (image, official rarity, TCGplayer link)
      ...(api?.apiId && {
        apiId: api.apiId,
        officialRarity: api.officialRarity,
        // Self-hosted copy from npm run fetch-images if there is one, else the API's image server
        ...(existsSync(join(IMAGE_DIR, imageFileFor(api)))
          ? { image: `/card-images/${imageFileFor(api)}`, imageLarge: `/card-images/${imageFileFor(api)}` }
          : { image: api.image, imageLarge: api.imageLarge }),
        tcgplayerUrl: api.tcgplayerUrl,
        priceUpdatedAt: api.priceUpdatedAt,
      }),
    })
  }
}

// ---------- packs ----------
// rarity on a pack = the guaranteed minimum "hit" rarity.
// Prices come from PACK_PRICES (researched market prices, with sources). Products without
// their own market price follow a stated rule and are labelled as estimates.
const PACK_TYPES = {
  Pokémon: [
    { kind: 'Booster Pack', slot: 'booster', cards: 10, hit: R, hitSlots: 1, price: (m) => [m.price, m.source] },
    {
      kind: 'Sleeved Booster',
      slot: 'sleeved',
      cards: 10,
      hit: R,
      hitSlots: 1,
      price: (m) => (m.sleeved ? [m.sleeved, m.source] : [m.price, estimate('Estimate: same cards as a booster pack, priced like one')]),
    },
    { kind: '3-Pack Blister', slot: 'blister', cards: 30, hit: R, hitSlots: 3, price: (m) => [m.price * 3 + 2, estimate('Estimate: 3 × the booster pack price + $2 for the promo card')] },
  ],
}

const packs = []
let pIdx = 1
const pushPack = (p) => packs.push({ id: `pk-${String(pIdx++).padStart(3, '0')}`, type: 'pack', condition: 'Sealed', ...p })

for (const [game, sets] of Object.entries(SETS)) {
  for (const set of sets) {
    for (const t of PACK_TYPES[game]) {
      // Only sell products that really exist for this set (special sets have no sleeved
      // boosters or 3-pack blisters)
      if (PACK_COVERS[set]?.[t.slot] === null) continue
      const source = weighted([['Direct', 45], ['Vendor', 40], ['Collector', 15]])
      const pack = {
        name: `${set} ${t.kind}`,
        game,
        set,
        kind: t.kind,
        rarity: t.hit,
        cardsPerPack: t.cards,
        hitSlots: t.hitSlots,
        source,
        seller: sellerFor(game, source),
        stock: Math.ceil(between(source === 'Collector' ? 1 : 6, source === 'Collector' ? 4 : 60)),
        featured: false,
      }
      const [price, priceSource] = t.price(PACK_PRICES[set])
      pack.price = money(price)
      pack.priceSource = priceSource
      // Official product photo, once downloaded with npm run fetch-covers
      const coverId = coverIdFor(set, t.slot)
      if (coverId && existsSync(join(COVER_DIR, coverFileFor(coverId)))) pack.image = `/pack-covers/${coverFileFor(coverId)}`
      pushPack(pack)
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
const SERIES_PACK_MIN = 0.5 // and every single pack holds at least 50% of its price
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
  const budget = t.price * t.packCount * SERIES_PAYOUT // total card value the whole drop may hold
  const packMin = t.price * SERIES_PACK_MIN // value every single pack must hold

  // Filler copies (Common/Uncommon/Rare), spread round-robin over each tier's cards
  const fillerTotal = t.packCount * fillerPerPack
  const fillers = []
  FILLER_MIX.forEach(([rarity, share], i) => {
    const n = i === FILLER_MIX.length - 1 ? fillerTotal - fillers.length : Math.round(fillerTotal * share)
    const cards = shuffle(pool(rarity))
    for (let k = 0; k < n; k++) fillers.push(cards[k % cards.length])
  })
  const sealed = Array.from({ length: t.packCount }, (_, i) => ({
    fillers: fillers.slice(i * fillerPerPack, (i + 1) * fillerPerPack),
    hits: [],
  }))
  const packValue = (p) => sumValue(p.fillers) + sumValue(p.hits)

  // Hit cards (Ultra Rare or better). Chase cards (worth more than the pack itself) are
  // scarce, with a few copies each; everyday hits can repeat as often as the drop needs.
  const hitPool = [...pool(UR), ...pool(SR)].sort(byPrice)
  const isChase = (card) => card.marketPrice > t.price
  const used = new Map()
  const count = (card) => used.get(card.id) ?? 0
  const copiesLeft = (card) => (isChase(card) ? maxCopies(card) - count(card) : Infinity)
  const take = (card) => used.set(card.id, count(card) + 1)
  const release = (card) => used.set(card.id, count(card) - 1)

  // 1) Every pack first: pick hits that bring the pack up to its minimum with as little
  //    overshoot as possible. Among cards close in price to the cheapest one that covers
  //    this slot's share of what's missing, use the least-used one so drops stay varied.
  for (const pack of sealed) {
    for (let slot = 0; slot < t.hitSlots; slot++) {
      const missing = Math.max(0, packMin - packValue(pack)) / (t.hitSlots - slot)
      const available = hitPool.filter((c) => copiesLeft(c) > 0)
      const cheapestEnough = available.find((c) => c.marketPrice >= missing) ?? available.at(-1)
      const similar = available.filter((c) => c.marketPrice >= cheapestEnough.marketPrice && c.marketPrice <= cheapestEnough.marketPrice * 1.5 + 1)
      const card = similar.sort((a, b) => count(a) - count(b) || byPrice(a, b))[0]
      take(card)
      pack.hits.push(card)
    }
  }

  // 2) Then the chase cards: spend what's left of the budget swapping a pack's cheapest hit
  //    for something better, biggest chase card first. Swaps only add value, so every pack
  //    keeps its minimum.
  let total = sumValue(sealed.map(packValue).map((v) => ({ marketPrice: v })))
  for (let changed = true; changed; ) {
    changed = false
    for (const card of [...hitPool].reverse()) {
      if (copiesLeft(card) <= 0) continue
      const pack = sealed[Math.floor(rand() * sealed.length)]
      const cheapest = [...pack.hits].sort(byPrice)[0]
      const delta = card.marketPrice - cheapest.marketPrice
      if (delta <= 0 || total + delta > budget) continue
      pack.hits[pack.hits.indexOf(cheapest)] = card
      release(cheapest)
      take(card)
      total += delta
      changed = true
    }
  }

  // Checks: every pack holds its minimum, and the drop never pays out more than the budget
  const values = sealed.map(packValue)
  if (Math.min(...values) < packMin - 0.01) throw new Error(`${game} ${t.tier}: a pack is under ${SERIES_PACK_MIN * 100}% of its price`)
  if (total > budget + 0.01) throw new Error(`${game} ${t.tier}: the drop holds more value than its budget`)

  const counts = new Map()
  for (const c of sealed.flatMap((p) => [...p.hits, ...p.fillers])) counts.set(c.id, (counts.get(c.id) ?? 0) + 1)
  const rank = [C, U, R, UR, SR]
  const checklist = [...counts]
    .map(([id, copies]) => ({ id, copies, card: singles.find((s) => s.id === id) }))
    .sort((a, b) => rank.indexOf(b.card.rarity) - rank.indexOf(a.card.rarity) || b.card.marketPrice - a.card.marketPrice)
    .map(({ id, copies }) => ({ id, copies }))

  return {
    checklist,
    packs: shuffle(sealed).map((p) => [...p.fillers.sort(byPrice), ...p.hits.sort(byPrice)].map((c) => c.id)),
    totalValue: money(total),
    minPackValue: money(Math.min(...values)),
  }
}

const series = []
for (const game of Object.keys(SETS)) {
  for (const t of SERIES_TIERS) {
    const built = buildSeries(game, t)
    const id = `sr-${t.tier.toLowerCase()}`
    pushPack({
      name: `Gempack ${t.tier} Pack`,
      game,
      set: SERIES_NAME,
      kind: `${t.tier} Series Pack`,
      rarity: UR,
      price: t.price,
      cardsPerPack: SERIES_CARDS_PER_PACK,
      hitSlots: t.hitSlots,
      source: 'Direct',
      seller: 'Gempack TCG',
      stock: t.packCount,
      featured: true,
      gemTier: t.tier,
      seriesId: id,
      priceSource: { label: `Gempack product: the drop's cards add up to ${SERIES_PAYOUT * 100}% of what the drop sells for`, gempack: true },
    })
    series.push({ id, packId: packs.at(-1).id, name: `${SERIES_NAME}: ${t.tier}`, game, tier: t.tier, ...built })
  }
}

// ---------- auction house ----------
// Live listings from Gempack (official) and verified collectors. End times are stored as
// minutes from when the visitor first opens the site, so countdowns are always live.
const BIDDERS = ['@pullrate_pete', '@holo_hunter', '@sleevedup', '@binderbrooke', '@topdeck_tay', '@gradedgabe', '@ripking22', '@mintcondition_mia', '@cardboardcrack', '@nm_or_bust']
const auctionCards = shuffle(singles.filter((c) => c.rarity !== C && c.marketPrice >= 2)).slice(0, 36)
const auctions = auctionCards.map((card, i) => {
  const official = rand() < 0.3
  const seller = official ? 'Gempack TCG' : pick(COLLECTORS)
  const condition = weighted([['Near Mint', 75], ['Lightly Played', 25]])
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
  { id: 'ev-1', title: 'Live Rip Showcase: Destined Rivals', type: 'Live Showcase', date: '2026-11-13T19:00:00-08:00', location: 'Livestream · Gempack TV', game: 'Pokémon', blurb: 'We open 36 packs on stream. Every pull is listed in the shop within the hour.' },
  { id: 'ev-2', title: 'League Challenge Night', type: 'Community', date: '2026-11-20T17:00:00-08:00', location: 'Partner store: Kanto Card Co.', game: 'Pokémon', blurb: 'Bring a deck and play for packs. Every entrant gets a Gempack Emerald Pack.' },
  { id: 'ev-3', title: 'Collector Auction Day', type: 'Community', date: '2026-11-21T12:00:00-08:00', location: 'Gempack HQ + online', game: 'Pokémon', blurb: 'Bring your binder. Get verified on the spot and list your best cards in the Auction House.' },
  { id: 'ev-4', title: 'Prerelease Weekend', type: 'Set Release', date: '2026-12-05T10:00:00-08:00', location: 'Partner store: Stadium Cards', game: 'Pokémon', blurb: 'Build and Battle prerelease events all weekend, with sealed packs in stock.' },
  { id: 'ev-5', title: 'Holiday Gold Pack Drop', type: 'Live Showcase', date: '2026-12-12T18:00:00-08:00', location: 'Livestream · Gempack TV', game: 'Pokémon', blurb: 'Series 2 opens: new Emerald, Amethyst and Gold drops with a fresh checklist of chase cards.' },
]

mkdirSync(OUT, { recursive: true })
const write = (file, data) => writeFileSync(join(OUT, file), JSON.stringify(data, null, 2) + '\n')
write('singles.json', singles)
write('packs.json', packs)
write('events.json', events)
write('series.json', series)
write('auctions.json', auctions)
// Saved browser state (cart, opened drops, auctions) points at these ids, so the app
// clears it whenever the catalog changes. The version is a hash of the generated data.
write('meta.json', {
  version: createHash('sha1').update(JSON.stringify([singles, packs, series, auctions])).digest('hex').slice(0, 10),
})
console.log(`Wrote ${singles.length} singles, ${packs.length} packs, ${series.length} series, ${auctions.length} auctions, ${events.length} events to src/data`)

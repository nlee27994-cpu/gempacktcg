// Generates the mock catalog in src/data/*.json.
// Deterministic (seeded PRNG), so re-running produces the same files.
// Usage: npm run generate-data
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createPackEngine, solveFloor } from '../src/lib/packEngine.js'

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
const CONDITION_MULT = {
  'Near Mint': 1,
  'Lightly Played': 0.85,
  'Moderately Played': 0.65,
  'PSA 9': 1.7,
  'PSA 10': 3.2,
}

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
    const source = weighted([['Direct', 30], ['Vendor', 35], ['Consignment', 35]])
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
      stock: source === 'Consignment' ? 1 : Math.ceil(between(1, rarity === SR ? 2 : 12)),
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
      const source = weighted([['Direct', 45], ['Vendor', 40], ['Consignment', 15]])
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
        stock: Math.ceil(between(source === 'Consignment' ? 1 : 6, source === 'Consignment' ? 4 : 60)),
        featured: false,
      })
    }
  }
}

// Gempack-exclusive curated mystery packs: our signature product, highest floors
// Every tier guarantees Ultra Rare or better; higher tiers add hit slots and boost Secret Rare odds.
const MYSTERY = [
  { tier: 'Emerald', price: 29.99, hitSlots: 1 },
  { tier: 'Amethyst', price: 59.99, hitSlots: 2 },
  { tier: 'Gold', price: 149.99, hitSlots: 3 },
]
for (const game of Object.keys(SETS)) {
  for (const m of MYSTERY) {
    pushPack({
      name: `Gempack ${m.tier} Mystery Pack — ${game}`,
      game,
      set: 'Gempack Curated',
      kind: `${m.tier} Mystery Pack`,
      rarity: UR,
      price: m.price,
      cardsPerPack: 5,
      hitSlots: m.hitSlots,
      source: 'Direct',
      seller: 'Gempack TCG',
      stock: Math.ceil(between(10, 40)),
      featured: true,
      gemTier: m.tier,
    })
  }
}

// ---------- price floors ----------
// Floors come from simulated pulls: the highest floor whose expected store-credit payout
// stays within budget. Mystery packs get a bigger budget because they are our headline product.
const engine = createPackEngine(singles)
packs.forEach((p, i) => {
  p.priceFloor = solveFloor(engine, p, p.gemTier ? 0.12 : 0.06, 1500, 1000 + i)
})

// ---------- events ----------
const events = [
  { id: 'ev-1', title: 'Live Rip Showcase: Prismatic Evolutions', type: 'Live Showcase', date: '2026-10-30T19:00:00-07:00', location: 'Livestream · Gempack TV', game: 'Pokémon', blurb: 'We open 36 packs on stream. Every pull is listed in the shop within the hour.' },
  { id: 'ev-2', title: 'One Piece OP-13 Release Night', type: 'Set Release', date: '2026-11-07T17:00:00-07:00', location: 'Partner store: Grand Line Collectibles', game: 'One Piece', blurb: 'Midnight-style release with sealed pre-orders, a Leader draft and prizes.' },
  { id: 'ev-3', title: 'Magic Prerelease Weekend', type: 'Set Release', date: '2026-11-14T10:00:00-07:00', location: 'Partner store: Blue Mana Games', game: 'Magic: The Gathering', blurb: 'Sealed prerelease events all weekend. Prerelease Packs ship with a price floor.' },
  { id: 'ev-4', title: 'Collector Consignment Day', type: 'Community', date: '2026-11-21T12:00:00-08:00', location: 'Gempack HQ + online', game: 'All games', blurb: 'Bring your binder. Get it graded, priced and listed by our team on the spot.' },
  { id: 'ev-5', title: 'Holiday Gold Pack Drop', type: 'Live Showcase', date: '2026-12-12T18:00:00-08:00', location: 'Livestream · Gempack TV', game: 'All games', blurb: 'A limited run of 250 Gold Mystery Packs, each with two Secret Rare hit slots.' },
]

mkdirSync(OUT, { recursive: true })
const write = (file, data) => writeFileSync(join(OUT, file), JSON.stringify(data, null, 2) + '\n')
write('singles.json', singles)
write('packs.json', packs)
write('events.json', events)
console.log(`Wrote ${singles.length} singles, ${packs.length} packs, ${events.length} events to src/data`)

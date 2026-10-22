// Pulls real Magic: The Gathering cards and prices from Scryfall (https://scryfall.com/docs/api)
// into src/data/mtg-api.json. generate-data.mjs then uses that snapshot for the Magic side of
// the catalog instead of the built-in list. Scryfall's USD prices come from TCGplayer, daily.
//
// Usage: npm run sync:mtg   (syncs, then rebuilds the catalog)
import { getJson, pickPerSet, sleep, writeSnapshot } from './sync-utils.mjs'

const API = process.env.SCRYFALL_API_URL ?? 'https://api.scryfall.com'
// Scryfall asks every client to send a User-Agent and Accept header
const HEADERS = { 'User-Agent': 'GempackTCG/0.1 (student demo)', Accept: 'application/json' }

// Our set names → Scryfall set codes
const SETS = {
  Bloomburrow: 'blb',
  Duskmourn: 'dsk',
  Foundations: 'fdn',
  Aetherdrift: 'dft',
  'Tarkir: Dragonstorm': 'tdm',
  'Final Fantasy': 'fin',
  'Edge of Eternities': 'eoe',
}

const SPECIAL_FRAMES = ['showcase', 'extendedart', 'inverted', 'etched']
const SPECIAL_FOILS = ['serialized', 'surgefoil', 'fracturefoil', 'raisedfoil', 'galaxyfoil', 'textured', 'halofoil']

// Special printings (borderless, showcase, serialized, fancy foils) are the chase cards
function treatment(card) {
  if (card.promo_types?.includes('serialized')) return 'Serialized'
  if (card.border_color === 'borderless') return 'Borderless'
  if (card.frame_effects?.includes('showcase')) return 'Showcase'
  if (card.frame_effects?.includes('extendedart')) return 'Extended Art'
  if (card.frame_effects?.some((f) => SPECIAL_FRAMES.includes(f))) return 'Special Frame'
  if (card.promo_types?.some((p) => SPECIAL_FOILS.includes(p))) return 'Special Foil'
  return null
}

// Scryfall rarity + printing → the five gem tiers the site uses
function tierFor(card, special) {
  if (card.type_line?.includes('Basic Land')) return 'Common'
  switch (card.rarity) {
    case 'common':
      return 'Common'
    case 'uncommon':
      return 'Uncommon'
    case 'rare':
      return special ? 'Secret Rare' : 'Rare'
    case 'mythic':
      return special ? 'Secret Rare' : 'Ultra Rare'
    default:
      return 'Secret Rare' // 'special' and 'bonus' printings
  }
}

const price = (card) => Number(card.prices?.usd ?? card.prices?.usd_foil ?? card.prices?.usd_etched) || null
const imageOf = (card, size) => card.image_uris?.[size] ?? card.card_faces?.[0]?.image_uris?.[size] ?? null
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1)

async function fetchSet(code) {
  const q = new URLSearchParams({ q: `set:${code} game:paper`, unique: 'prints', order: 'usd', dir: 'desc' })
  const cards = []
  let url = `${API}/cards/search?${q}`
  while (url) {
    const body = await getJson(url, HEADERS)
    cards.push(...body.data)
    url = body.has_more ? body.next_page : null
    await sleep(120) // Scryfall asks for no more than ~10 requests a second
  }
  return cards
}

const today = new Date().toISOString().slice(0, 10)
const kept = []
for (const [setName, code] of Object.entries(SETS)) {
  process.stdout.write(`${setName} (${code}) … `)
  let raw
  try {
    raw = await fetchSet(code)
  } catch (err) {
    console.log(`skipped: ${err.message}`)
    continue
  }
  const priced = raw
    .map((c) => {
      const special = treatment(c)
      return { c, special, tier: tierFor(c, special), price: price(c) }
    })
    .filter((x) => x.price)
  const picks = pickPerSet(priced)
  for (const { c, special, tier, price: p } of picks) {
    kept.push({
      apiId: c.id,
      name: special ? `${c.name} (${special})` : c.name,
      set: setName,
      number: c.collector_number,
      rarity: tier,
      officialRarity: `${capitalize(c.rarity)}${special ? ` · ${special}` : ''}`,
      marketPrice: Math.round(p * 100) / 100,
      image: imageOf(c, 'normal'),
      imageLarge: imageOf(c, 'large'),
      tcgplayerUrl: c.purchase_uris?.tcgplayer ?? null,
      priceUpdatedAt: today,
    })
  }
  console.log(`${raw.length} printings, ${priced.length} priced, kept ${picks.length}`)
}

writeSnapshot('mtg-api.json', 'Scryfall (scryfall.com); USD prices are TCGplayer market prices', kept)

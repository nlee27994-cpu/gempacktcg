// Pulls real Pokémon cards and TCGplayer market prices from the Pokémon TCG API
// (https://pokemontcg.io) into src/data/pokemon-api.json. generate-data.mjs then uses
// that snapshot for the Pokémon side of the catalog instead of the built-in list.
//
// Usage:   npm run sync:pokemon        (syncs, then rebuilds the catalog)
// Optional: POKEMONTCG_API_KEY=...     raises the API rate limit (free key at pokemontcg.io)
import { getJson, pickPerSet, writeSnapshot } from './sync-utils.mjs'

const API = process.env.POKEMONTCG_API_URL ?? 'https://api.pokemontcg.io/v2'
const API_KEY = process.env.POKEMONTCG_API_KEY

// Our set names → Pokémon TCG API set ids
const SETS = {
  'Prismatic Evolutions': 'sv8pt5',
  'Surging Sparks': 'sv8',
  'Stellar Crown': 'sv7',
  'Twilight Masquerade': 'sv6',
  'Scarlet & Violet 151': 'sv3pt5',
  'Obsidian Flames': 'sv3',
  'Paldean Fates': 'sv4pt5',
  'Temporal Forces': 'sv5',
  'Journey Together': 'sv9',
  'Destined Rivals': 'sv10',
  'Shrouded Fable': 'sv6pt5',
}

// The API's official rarities → the five gem tiers the site uses
const TIER = {
  Common: 'Common',
  Uncommon: 'Uncommon',
  Rare: 'Rare',
  'Rare Holo': 'Rare',
  'Double Rare': 'Rare',
  'ACE SPEC Rare': 'Rare',
  'Shiny Rare': 'Rare',
  'Ultra Rare': 'Ultra Rare',
  'Illustration Rare': 'Ultra Rare',
  'Shiny Ultra Rare': 'Ultra Rare',
  'Special Illustration Rare': 'Secret Rare',
  'Hyper Rare': 'Secret Rare',
}

// TCGplayer lists prices per printing; use the first printing that has a market price
const PRINTINGS = ['holofoil', 'normal', 'reverseHolofoil', '1stEditionHolofoil', 'unlimitedHolofoil']

async function fetchSet(setId) {
  const cards = []
  for (let page = 1; ; page++) {
    const q = new URLSearchParams({
      q: `set.id:${setId}`,
      page: String(page),
      pageSize: '250',
      select: 'id,name,number,rarity,images,tcgplayer',
    })
    const body = await getJson(`${API}/cards?${q}`, API_KEY ? { 'X-Api-Key': API_KEY } : {})
    cards.push(...body.data)
    if (cards.length >= body.totalCount || body.data.length === 0) return cards
  }
}

function marketPrice(card) {
  const prices = card.tcgplayer?.prices ?? {}
  for (const printing of PRINTINGS) {
    const market = prices[printing]?.market
    if (market > 0) return market
  }
  return null
}

const kept = []
for (const [setName, setId] of Object.entries(SETS)) {
  process.stdout.write(`${setName} (${setId}) … `)
  let raw
  try {
    raw = await fetchSet(setId)
  } catch (err) {
    console.log(`skipped: ${err.message}`)
    continue
  }
  const priced = raw
    .map((c) => ({ c, tier: TIER[c.rarity], price: marketPrice(c) }))
    .filter((x) => x.tier && x.price)
  const picks = pickPerSet(priced)
  for (const { c, tier, price } of picks) {
    kept.push({
      apiId: c.id,
      name: c.name,
      set: setName,
      number: c.number,
      rarity: tier,
      officialRarity: c.rarity,
      marketPrice: Math.round(price * 100) / 100,
      image: c.images?.small ?? null,
      imageLarge: c.images?.large ?? null,
      tcgplayerUrl: c.tcgplayer?.url ?? null,
      priceUpdatedAt: c.tcgplayer?.updatedAt ?? null,
    })
  }
  console.log(`${raw.length} cards, ${priced.length} priced, kept ${picks.length}`)
}

writeSnapshot('pokemon-api.json', 'Pokémon TCG API (pokemontcg.io); prices are TCGplayer market prices', kept)

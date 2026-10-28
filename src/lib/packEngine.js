// Pure pack-opening engine (no app imports), shared by the app and scripts/generate-data.mjs
import { RARITIES, rarityRank } from './rarity.js'

// Odds for regular (non-hit) slots
const FILLER_ODDS = [
  ['Common', 0.72],
  ['Uncommon', 0.28],
]
// Big products (prerelease kits, blisters) only reveal a handful of filler cards;
// the rest count as bulk at a flat value.
const MAX_SHOWN_FILLER = 5
const BULK_VALUE = 0.05
// Share of a pack's price that an average pack pays back in card value. Real sealed packs
// return well under half: PackMagik (mid-2026) puts Destined Rivals at $3.09 on $11.50 (27%),
// Shrouded Fable at $3.57 on $13.95 (26%) and Paldean Fates at $4.11 on $23.99 (17%).
// Packs Gempack builds itself set their own, fairer `targetReturn`.
export const STORE_PACK_RETURN = 0.3
const SET_BONUS = 4

const round2 = (n) => Math.round(n * 100) / 100

export function createPackEngine(singles) {
  // Cards from the pack's own set show up more often, and within a tier,
  // pricier chase cards are rarer (weight falls with the square root of price).
  const pools = new Map()
  function poolFor(pack, rarity) {
    const key = `${pack.game}|${pack.set}|${rarity}`
    if (!pools.has(key)) pools.set(key, buildPool(pack, rarity))
    return pools.get(key)
  }

  function buildPool(pack, rarity) {
    let rank = rarityRank(rarity)
    let cards = []
    // Fall back to the nearest lower tier if a game has no cards at that tier
    while (cards.length === 0 && rank >= 0) {
      cards = singles.filter((s) => s.game === pack.game && s.rarity === RARITIES[rank])
      rank--
    }
    return cards.map((card) => [card, (card.set === pack.set ? SET_BONUS : 1) / Math.sqrt(card.marketPrice)])
  }

  function tierValue(pack, rarity) {
    const pool = poolFor(pack, rarity)
    const total = pool.reduce((s, [, w]) => s + w, 0)
    return pool.reduce((s, [c, w]) => s + c.marketPrice * w, 0) / total
  }

  function weightedPick(entries, rand) {
    const total = entries.reduce((s, [, w]) => s + w, 0)
    let r = rand() * total
    for (const [value, w] of entries) {
      if ((r -= w) < 0) return value
    }
    return entries[entries.length - 1][0]
  }

  function layout(pack) {
    const hitSlots = Math.min(pack.hitSlots, pack.cardsPerPack)
    const shownFiller = Math.min(pack.cardsPerPack - hitSlots, MAX_SHOWN_FILLER)
    return { hitSlots, shownFiller, bulkCount: pack.cardsPerPack - hitSlots - shownFiller }
  }

  /**
   * Hit-slot odds are solved per pack so the average pull lands near targetReturn × price.
   * Shape: each tier above the guaranteed one gets probability a, a/5, ... and `a` is solved
   * from the expected value of each tier. Clamped so every pack keeps a real shot at a chase card.
   */
  function calibrate(pack) {
    const { shownFiller, bulkCount, hitSlots } = layout(pack)
    const fillerEV = FILLER_ODDS.reduce((s, [r, p]) => s + p * tierValue(pack, r), 0)
    const target = pack.price * (pack.targetReturn ?? STORE_PACK_RETURN)
    return solveHitOdds(pack, (target - shownFiller * fillerEV - bulkCount * BULK_VALUE) / hitSlots)
  }

  /**
   * Price for a pack Gempack builds itself: what its contents are worth at the lowest
   * chase-card odds, divided by the share of value it promises to pay back.
   */
  function fairPrice(pack) {
    return round2(solveHitOdds(pack, -Infinity).expectedValue / pack.targetReturn)
  }

  // Hit-slot odds whose average value per hit slot comes as close to `perSlot` as the clamps allow
  function solveHitOdds(pack, perSlot) {
    const { hitSlots, shownFiller, bulkCount } = layout(pack)
    const fillerEV = FILLER_ODDS.reduce((s, [r, p]) => s + p * tierValue(pack, r), 0)

    const tiers = RARITIES.slice(rarityRank(pack.rarity))
    const ev = tiers.map((t) => tierValue(pack, t))
    let hit
    if (tiers.length === 1) {
      hit = [[tiers[0], 1]]
    } else if (tiers.length === 2) {
      const a = Math.min(0.9, Math.max(0.02, (perSlot - ev[0]) / (ev[1] - ev[0])))
      hit = [[tiers[0], 1 - a], [tiers[1], a]]
    } else {
      const a = Math.min(0.8, Math.max(0.01, (perSlot - ev[0]) / (ev[1] - ev[0] + (ev[2] - ev[0]) / 5)))
      hit = [[tiers[0], 1 - 1.2 * a], [tiers[1], a], [tiers[2], a / 5]]
    }
    const hitEV = hit.reduce((s, [t, p]) => s + p * ev[tiers.indexOf(t)], 0)
    return {
      filler: FILLER_ODDS,
      hit,
      expectedValue: round2(shownFiller * fillerEV + bulkCount * BULK_VALUE + hitSlots * hitEV),
    }
  }

  const cache = new Map()
  function oddsFor(pack) {
    if (!cache.has(pack.id)) cache.set(pack.id, calibrate(pack))
    return cache.get(pack.id)
  }

  function drawCard(pack, rarity, rand) {
    const card = weightedPick(poolFor(pack, rarity), rand)
    // Fresh pulls are raw near-mint copies, whatever condition the shop listing is in
    return { ...card, condition: 'Near Mint', pulledValue: card.marketPrice }
  }

  /**
   * Simulates opening a pack.
   * Hit slots go last so the reveal builds toward the best card.
   */
  function openPack(pack, rand = Math.random) {
    const { hitSlots, shownFiller, bulkCount } = layout(pack)
    const odds = oddsFor(pack)
    const cards = []
    for (let i = 0; i < shownFiller; i++) {
      cards.push(drawCard(pack, weightedPick(odds.filler, rand), rand))
    }
    cards.sort((a, b) => rarityRank(a.rarity) - rarityRank(b.rarity))
    const hits = []
    for (let i = 0; i < hitSlots; i++) {
      hits.push({ ...drawCard(pack, weightedPick(odds.hit, rand), rand), isHit: true })
    }
    hits.sort((a, b) => a.pulledValue - b.pulledValue)
    cards.push(...hits)

    const bulkValue = round2(bulkCount * BULK_VALUE)
    const pulledValue = round2(cards.reduce((s, c) => s + c.pulledValue, 0) + bulkValue)

    return {
      cards: cards.map((c, i) => ({ ...c, slot: i })),
      bulkCount,
      bulkValue,
      pulledValue,
      net: round2(pulledValue - pack.price),
    }
  }

  return { oddsFor, openPack, fairPrice }
}

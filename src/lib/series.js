import seriesList from '../data/series.json'
import { getProduct } from './catalog'
import { rarityRank } from './rarity'

const byId = new Map(seriesList.map((s) => [s.id, s]))
export const getSeries = (id) => byId.get(id)

const round2 = (n) => Math.round(n * 100) / 100

/** Live state of a drop, given the indices of packs already opened */
export function seriesStatus(series, opened = []) {
  const openedSet = new Set(opened)
  const remaining = new Map(series.checklist.map((c) => [c.id, c.copies]))
  const unopened = []
  series.packs.forEach((cards, i) => {
    if (openedSet.has(i)) cards.forEach((id) => remaining.set(id, remaining.get(id) - 1))
    else unopened.push(i)
  })
  const chanceOf = (rarity) =>
    unopened.length
      ? unopened.filter((i) => series.packs[i].some((id) => getProduct(id).rarity === rarity)).length / unopened.length
      : 0
  return {
    totalPacks: series.packs.length,
    packsLeft: unopened.length,
    unopened,
    remaining,
    secretRareChance: chanceOf('Secret Rare'),
    valueLeft: round2(unopened.reduce((s, i) => s + series.packs[i].reduce((v, id) => v + getProduct(id).marketPrice, 0), 0)),
  }
}

/** Builds the same result shape as openPack() for a sealed series pack */
export function seriesPackResult(pack, cardIds) {
  const cards = cardIds
    .map((id) => {
      const card = getProduct(id)
      return { ...card, condition: 'Near Mint', pulledValue: card.marketPrice, isHit: rarityRank(card.rarity) >= rarityRank('Ultra Rare') }
    })
    .map((c, slot) => ({ ...c, slot }))
  const pulledValue = round2(cards.reduce((s, c) => s + c.pulledValue, 0))
  const floorCredit = Math.max(0, round2(pack.priceFloor - pulledValue))
  return {
    cards,
    bulkCount: 0,
    bulkValue: 0,
    pulledValue,
    floorCredit,
    totalValue: round2(pulledValue + floorCredit),
    net: round2(pulledValue + floorCredit - pack.price),
  }
}

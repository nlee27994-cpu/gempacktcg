import packs from '../data/packs.json'
import singles from '../data/singles.json'
import events from '../data/events.json'

export { packs, singles, events }

export const GAMES = ['Pokémon', 'Magic: The Gathering', 'One Piece']
export const SOURCES = ['Direct', 'Vendor', 'Consignment']
export const CONDITIONS = ['Near Mint', 'Lightly Played', 'Moderately Played', 'PSA 9', 'PSA 10']

export const GAME_SHORT = {
  Pokémon: 'Pokémon',
  'Magic: The Gathering': 'MTG',
  'One Piece': 'One Piece',
}

export const allProducts = [...packs, ...singles]
const byId = new Map(allProducts.map((p) => [p.id, p]))

export const getProduct = (id) => byId.get(id)

export const featuredDrops = singles
  .filter((s) => s.featured)
  .sort((a, b) => b.marketPrice - a.marketPrice)
  .slice(0, 6)

export const seriesPacks = packs.filter((p) => p.gemTier)

export const relatedProducts = (product, limit = 4) =>
  allProducts
    .filter((p) => p.id !== product.id && p.type === product.type && p.game === product.game)
    .sort((a, b) => (a.set === product.set ? -1 : 0) - (b.set === product.set ? -1 : 0))
    .slice(0, limit)

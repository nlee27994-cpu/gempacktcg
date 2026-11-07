import packs from '../data/packs.json'
import singles from '../data/singles.json'
import events from '../data/events.json'
import auctions from '../data/auctions.json'
import meta from '../data/meta.json'

export { packs, singles, events, auctions }

// Changes whenever the catalog is regenerated; used to key saved browser state
export const DATA_VERSION = meta.version

export const SOURCES = ['Direct', 'Vendor', 'Collector']
export const CONDITIONS = ['Near Mint', 'Lightly Played', 'Moderately Played', 'PSA 9', 'PSA 10']

export const allProducts = [...packs, ...singles]
const byId = new Map(allProducts.map((p) => [p.id, p]))

// Singles listed by the visitor from their Vault (registered by VaultContext)
const listed = new Map()
export const registerListing = (product) => listed.set(product.id, product)
export const unregisterListing = (id) => listed.delete(id)

// True for the fixed catalog (packs and singles), the products that exist in Shopify
export const isCatalogProduct = (id) => byId.has(id)

export const getProduct = (id) => byId.get(id) ?? listed.get(id)

// Everything the shop sells: the catalog plus the visitor's own listings
export const shopProducts = () => [...allProducts, ...listed.values()]

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

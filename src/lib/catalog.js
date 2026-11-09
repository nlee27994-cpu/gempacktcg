import packs from '../data/packs.json'
import singles from '../data/singles.json'
import events from '../data/events.json'
import auctions from '../data/auctions.json'
import meta from '../data/meta.json'
import { RARITIES } from './rarity'
import { shopifyEnabled, fetchShopifyProducts, idFromHandle } from './shopify'

export { packs, singles, events, auctions }

// Changes whenever the catalog is regenerated; used to key saved browser state
export const DATA_VERSION = meta.version

export const SOURCES = ['Direct', 'Vendor', 'Collector']
export const CONDITIONS = ['Near Mint', 'Lightly Played', 'Moderately Played', 'PSA 9', 'PSA 10']

// The local JSON holds each product's game details (odds, Series checklists, card numbers), which
// pack opening, the Vault and auctions need. With Shopify connected, Shopify decides what's for sale
// and its title, price and stock: see loadCatalog().
export const allProducts = [...packs, ...singles]
const byId = new Map(allProducts.map((p) => [p.id, p]))
const byVariant = new Map()

export { shopifyEnabled }
// Set when the store couldn't be reached; the site then shows nothing for sale
export let catalogError = null

// Stock to assume when Shopify says "available" but the token can't read exact quantities
const UNKNOWN_STOCK = 10

function fromShopify(sp) {
  return {
    available: sp.available,
    stock: !sp.available ? 0 : sp.quantity ?? UNKNOWN_STOCK,
    variantId: sp.variantId,
    handle: sp.handle,
  }
}

// Products created in Shopify admin by hand, with no local game data
function shopifyOnlyProduct(sp) {
  const tag = (list) => sp.tags.find((t) => list.includes(t))
  return {
    id: `shop-${sp.handle}`,
    type: 'single',
    name: sp.title,
    game: 'Pokémon',
    set: sp.vendor || '',
    rarity: tag(RARITIES) ?? 'Common',
    condition: tag(CONDITIONS) ?? 'Near Mint',
    source: 'Direct',
    seller: 'Gempack TCG',
    price: sp.price,
    marketPrice: sp.price,
    featured: false,
    image: sp.image,
    shopify: fromShopify(sp),
  }
}

/**
 * Loads what's for sale from Shopify and applies it to the catalog. Call once before rendering.
 * Products not in Shopify stay known (the Vault, auctions and Series still use them) but aren't for sale.
 */
export async function loadCatalog() {
  if (!shopifyEnabled) return
  for (const p of allProducts) p.stock = 0
  try {
    for (const sp of await fetchShopifyProducts()) {
      // Handles made by shopify:push are "gempack-sg-001"; products named by hand may use just "sg-001"
      const local = byId.get(idFromHandle(sp.handle)) ?? byId.get(sp.handle)
      const product = local ?? shopifyOnlyProduct(sp)
      if (local) {
        // The price note (where the price came from) only applies while Shopify's price matches it
        if (sp.price !== local.price) delete local.priceSource
        Object.assign(local, { name: sp.title, price: sp.price, shopify: fromShopify(sp) })
        if (!local.image && sp.image) local.image = sp.image
      } else {
        allProducts.push(product)
        byId.set(product.id, product)
      }
      product.stock = product.shopify.stock
      byVariant.set(sp.variantId, product)
    }
  } catch (err) {
    console.error('Could not load products from Shopify', err)
    catalogError = err.message || 'Could not reach the store.'
  }
  featuredDrops = pickFeatured()
}

export const productForVariant = (variantId) => byVariant.get(variantId)

// In Shopify mode only products published to the storefront are for sale
export const isForSale = (p) => !shopifyEnabled || Boolean(p.shopify)

// Singles listed by the visitor from their Vault (registered by VaultContext)
const listed = new Map()
export const registerListing = (product) => listed.set(product.id, product)
export const unregisterListing = (id) => listed.delete(id)

export const getProduct = (id) => byId.get(id) ?? listed.get(id)

// Everything the shop sells: the catalog plus the visitor's own listings
export const shopProducts = () => [...allProducts.filter(isForSale), ...listed.values()]

const pickFeatured = () =>
  singles
    .filter((s) => s.featured && isForSale(s))
    .sort((a, b) => b.marketPrice - a.marketPrice)
    .slice(0, 6)
export let featuredDrops = pickFeatured()

export const seriesPacks = packs.filter((p) => p.gemTier)

export const relatedProducts = (product, limit = 4) =>
  allProducts
    .filter((p) => p.id !== product.id && p.type === product.type && p.game === product.game && isForSale(p))
    .sort((a, b) => (a.set === product.set ? -1 : 0) - (b.set === product.set ? -1 : 0))
    .slice(0, limit)

// Shopify Storefront API client.
//
// When VITE_SHOPIFY_DOMAIN and VITE_SHOPIFY_STOREFRONT_TOKEN are set, Shopify is the source of truth
// for what's for sale (title, price, stock) and for the cart: the cart lives in Shopify, and checkout
// sends the buyer to the cart's checkoutUrl. Without them, the site runs on its local demo data.
//
// The public Storefront token is meant to be shipped to browsers. Never put an Admin token here.

const env = import.meta.env
const clean = (v) => v?.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
const DOMAIN = clean(env.VITE_SHOPIFY_DOMAIN || env.VITE_SHOPIFY_STORE_DOMAIN)
const TOKEN = env.VITE_SHOPIFY_STOREFRONT_TOKEN?.trim()
const API_VERSION = env.VITE_SHOPIFY_API_VERSION?.trim() || '2026-07'

export const shopifyEnabled = Boolean(DOMAIN && TOKEN)

// Catalog products are created in Shopify with this handle (scripts/shopify-push.mjs)
export const shopifyHandle = (id) => `gempack-${id}`.toLowerCase()
export const idFromHandle = (handle) => (handle.startsWith('gempack-') ? handle.slice('gempack-'.length) : null)

export async function storefront(query, variables) {
  const res = await fetch(`https://${DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': TOKEN },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`The store responded ${res.status}. Please try again.`)
  const json = await res.json()
  if (json.errors?.length) {
    const err = new Error(json.errors.map((e) => e.message).join('; '))
    err.graphQLErrors = json.errors
    throw err
  }
  return json.data
}

// --- products -------------------------------------------------------------------------------------

const productQuery = (withQuantity) => `
  query Products($cursor: String) {
    products(first: 250, after: $cursor) {
      pageInfo { hasNextPage endCursor }
      nodes {
        handle
        title
        productType
        vendor
        tags
        availableForSale
        featuredImage { url altText }
        variants(first: 1) {
          nodes {
            id
            availableForSale
            ${withQuantity ? 'quantityAvailable' : ''}
            price { amount currencyCode }
          }
        }
      }
    }
  }`

// Exact stock needs the "unauthenticated_read_product_inventory" permission on the storefront token.
// Without it Shopify rejects quantityAvailable, so we ask again without it.
let canReadQuantity = true

/** Every product published to this storefront's sales channel. */
export async function fetchShopifyProducts() {
  const products = []
  let cursor = null
  do {
    let data
    try {
      data = await storefront(productQuery(canReadQuantity), { cursor })
    } catch (err) {
      if (!canReadQuantity || !/quantityAvailable|access denied/i.test(err.message)) throw err
      canReadQuantity = false
      data = await storefront(productQuery(false), { cursor })
    }
    const page = data.products
    for (const p of page.nodes) {
      const variant = p.variants.nodes[0]
      if (!variant) continue
      products.push({
        handle: p.handle,
        title: p.title,
        productType: p.productType,
        vendor: p.vendor,
        tags: p.tags,
        image: p.featuredImage?.url ?? null,
        variantId: variant.id,
        available: variant.availableForSale,
        quantity: typeof variant.quantityAvailable === 'number' ? variant.quantityAvailable : null,
        price: Number(variant.price.amount),
      })
    }
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null
  } while (cursor)
  return products
}

// --- cart -----------------------------------------------------------------------------------------

const CART_FIELDS = `
  id
  checkoutUrl
  totalQuantity
  cost { subtotalAmount { amount currencyCode } }
  lines(first: 100) {
    nodes {
      id
      quantity
      merchandise { ... on ProductVariant { id product { handle title } } }
      cost { amountPerQuantity { amount } }
    }
  }`

const mutation = (name, args, call) => `
  mutation ${name}(${args}) {
    ${call} {
      cart { ${CART_FIELDS} }
      userErrors { field message }
      warnings { code message }
    }
  }`

const CART_QUERY = `query Cart($id: ID!) { cart(id: $id) { ${CART_FIELDS} } }`
const CART_CREATE = mutation('CartCreate', '$input: CartInput!', 'cartCreate(input: $input)')
const CART_LINES_ADD = mutation('CartLinesAdd', '$cartId: ID!, $lines: [CartLineInput!]!', 'cartLinesAdd(cartId: $cartId, lines: $lines)')
const CART_LINES_UPDATE = mutation('CartLinesUpdate', '$cartId: ID!, $lines: [CartLineUpdateInput!]!', 'cartLinesUpdate(cartId: $cartId, lines: $lines)')
const CART_LINES_REMOVE = mutation('CartLinesRemove', '$cartId: ID!, $lineIds: [ID!]!', 'cartLinesRemove(cartId: $cartId, lineIds: $lineIds)')

// Plain shape for the app: { id, checkoutUrl, lines: [{ lineId, variantId, handle, title, qty, price }] }
function toCart(cart) {
  if (!cart) return null
  return {
    id: cart.id,
    checkoutUrl: cart.checkoutUrl,
    subtotal: Number(cart.cost.subtotalAmount.amount),
    lines: cart.lines.nodes.map((l) => ({
      lineId: l.id,
      variantId: l.merchandise.id,
      handle: l.merchandise.product.handle,
      title: l.merchandise.product.title,
      qty: l.quantity,
      price: Number(l.cost.amountPerQuantity.amount),
    })),
  }
}

// Returns { cart, notice }: notice is Shopify's message when it changed the request (e.g. not enough stock)
function unwrap(result) {
  if (result.userErrors?.length) throw new Error(result.userErrors.map((e) => e.message).join('; '))
  return { cart: toCart(result.cart), notice: result.warnings?.map((w) => w.message).join(' ') || null }
}

/** The saved cart, or null if it no longer exists (for example, it was checked out). */
export const getCart = async (id) => toCart((await storefront(CART_QUERY, { id })).cart)

export const cartCreate = async (lines) =>
  unwrap((await storefront(CART_CREATE, { input: { lines } })).cartCreate)

export const cartLinesAdd = async (cartId, lines) =>
  unwrap((await storefront(CART_LINES_ADD, { cartId, lines })).cartLinesAdd)

export const cartLinesUpdate = async (cartId, lines) =>
  unwrap((await storefront(CART_LINES_UPDATE, { cartId, lines })).cartLinesUpdate)

export const cartLinesRemove = async (cartId, lineIds) =>
  unwrap((await storefront(CART_LINES_REMOVE, { cartId, lineIds })).cartLinesRemove)

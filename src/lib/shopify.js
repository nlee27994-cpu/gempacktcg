// Shopify Storefront API client for checkout.
//
// The site stays a static React app. When the two VITE_SHOPIFY_* build variables are set, checkout
// builds a Shopify cart and sends the buyer to Shopify's hosted checkout, so Shopify takes the payment
// and records the order. Without them, the demo checkout is used instead.
//
// Products are matched by handle: `npm run shopify:push` creates each catalog product in Shopify with
// the handle from shopifyHandle() below.

const DOMAIN = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN?.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
const TOKEN = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN?.trim()
const API_VERSION = import.meta.env.VITE_SHOPIFY_API_VERSION?.trim() || '2026-07'

export const shopifyEnabled = Boolean(DOMAIN && TOKEN)

// Must match scripts/shopify-push.mjs
export const shopifyHandle = (id) => `gempack-${id}`.toLowerCase()

async function storefront(query, variables) {
  const res = await fetch(`https://${DOMAIN}/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Shopify responded ${res.status}. Please try again.`)
  const json = await res.json()
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '))
  return json.data
}

// Looks up the Shopify variant for each catalog id. Returns Map(id -> { variantId, available }).
async function findVariants(ids) {
  const fields = ids
    .map(
      (id, i) =>
        `p${i}: product(handle: ${JSON.stringify(shopifyHandle(id))}) {
          variants(first: 1) { nodes { id availableForSale } }
        }`,
    )
    .join('\n')
  const data = await storefront(`query Variants { ${fields} }`)
  const found = new Map()
  ids.forEach((id, i) => {
    const variant = data[`p${i}`]?.variants?.nodes?.[0]
    if (variant) found.set(id, { variantId: variant.id, available: variant.availableForSale })
  })
  return found
}

const CART_CREATE = `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart { id checkoutUrl }
      userErrors { field message }
      warnings { code message }
    }
  }`

/**
 * Creates a Shopify cart for the given cart items and returns its hosted checkout URL.
 * items: [{ id, name, qty }]. Every item must be a catalog product pushed to Shopify.
 */
export async function createShopifyCheckout(items, { email } = {}) {
  if (!shopifyEnabled) throw new Error('Shopify checkout is not set up.')
  const ids = [...new Set(items.map((i) => i.id))]
  const variants = await findVariants(ids)

  const missing = items.filter((i) => !variants.has(i.id))
  if (missing.length) {
    throw new Error(`Not available in our checkout yet: ${missing.map((i) => i.name).join(', ')}.`)
  }
  const soldOut = items.filter((i) => !variants.get(i.id).available)
  if (soldOut.length) {
    throw new Error(`Sold out: ${soldOut.map((i) => i.name).join(', ')}. Remove it from your cart to continue.`)
  }

  const input = {
    lines: items.map((i) => ({ merchandiseId: variants.get(i.id).variantId, quantity: i.qty })),
    ...(email && { buyerIdentity: { email } }),
  }
  const { cartCreate } = await storefront(CART_CREATE, { input })
  if (cartCreate.userErrors?.length) throw new Error(cartCreate.userErrors.map((e) => e.message).join('; '))
  if (!cartCreate.cart?.checkoutUrl) throw new Error('Shopify did not return a checkout link.')
  return cartCreate.cart.checkoutUrl
}

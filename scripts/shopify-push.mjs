// Creates (or updates) a Shopify product for every pack and single in the catalog.
//
//   npm run shopify:push                 # all 117 products
//   npm run shopify:push -- --limit 3    # just the first 3, as a test
//   npm run shopify:push -- --only pk-001,sg-002
//   npm run shopify:push -- --dry-run    # show what would happen, change nothing
//
// Needs a .env file (copy .env.example). Uses a Dev Dashboard app installed on the store, with the
// scopes write_products, write_inventory, read_locations and write_publications.
//
// Safe to re-run. A new product gets its price, stock and image. An existing product only gets its
// title, description, tags and price updated: stock is never reset, so units already sold in Shopify
// stay sold, and images are not added twice.

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// --- config ---------------------------------------------------------------------------------------

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!m || line.trim().startsWith('#')) continue
    let value = m[2]
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1)
    if (process.env[m[1]] === undefined) process.env[m[1]] = value
  }
}
loadEnvFile(join(root, '.env'))

const args = process.argv.slice(2)
const flag = (name) => args.includes(`--${name}`)
const option = (name) => {
  const i = args.findIndex((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (i === -1) return undefined
  return args[i].includes('=') ? args[i].split('=').slice(1).join('=') : args[i + 1]
}

const DRY_RUN = flag('dry-run')
const LIMIT = option('limit') ? Number(option('limit')) : Infinity
const ONLY = option('only')?.split(',').map((s) => s.trim()).filter(Boolean)

const STORE = (process.env.SHOPIFY_STORE_DOMAIN || process.env.VITE_SHOPIFY_STORE_DOMAIN || '')
  .trim()
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '')
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID?.trim()
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET?.trim()
const STATIC_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN?.trim() // optional: a shpat_ token instead of client id/secret
const API_VERSION = process.env.SHOPIFY_API_VERSION?.trim() || '2026-07'
const SITE_URL = (process.env.SITE_URL || 'https://gempacktcg.com').replace(/\/+$/, '')
const PUBLICATION_MATCH = new RegExp(process.env.SHOPIFY_PUBLICATIONS || 'headless|online store', 'i')

if (Number.isNaN(LIMIT) || LIMIT < 1) fail('--limit must be a positive number')
if (!STORE && !DRY_RUN) fail('Set SHOPIFY_STORE_DOMAIN in .env (for example your-store.myshopify.com)')
if (!STATIC_TOKEN && !(CLIENT_ID && CLIENT_SECRET) && !DRY_RUN) {
  fail('Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET in .env (from your app in the Shopify Dev Dashboard)')
}

function fail(message) {
  console.error(`\n✖ ${message}\n`)
  process.exit(1)
}

// Must match src/lib/shopify.js
const shopifyHandle = (id) => `gempack-${id}`.toLowerCase()

// --- Admin API ------------------------------------------------------------------------------------

let accessToken = STATIC_TOKEN

// Dev Dashboard apps installed on a store you own can use the client credentials grant.
async function getAccessToken() {
  const res = await fetch(`https://${STORE}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET }),
  })
  const text = await res.text()
  if (!res.ok) {
    fail(`Could not get an access token from ${STORE} (HTTP ${res.status}). Check the client ID and secret, and that the app is installed on this store.\n  ${text.slice(0, 300)}`)
  }
  return JSON.parse(text).access_token
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function admin(query, variables, attempt = 1) {
  const res = await fetch(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': accessToken },
    body: JSON.stringify({ query, variables }),
  })
  if ((res.status === 429 || res.status >= 500) && attempt < 6) {
    await sleep(1000 * attempt)
    return admin(query, variables, attempt + 1)
  }
  const text = await res.text()
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`)
  const json = JSON.parse(text)
  if (json.errors?.some((e) => e.extensions?.code === 'THROTTLED') && attempt < 6) {
    await sleep(1000 * attempt)
    return admin(query, variables, attempt + 1)
  }
  if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join('; '))
  return json.data
}

function checkUserErrors(result, what) {
  const errors = result?.userErrors ?? []
  if (errors.length) throw new Error(`${what}: ${errors.map((e) => `${e.field?.join('.') ?? ''} ${e.message}`.trim()).join('; ')}`)
}

// --- catalog → Shopify ----------------------------------------------------------------------------

const readJson = (rel) => JSON.parse(readFileSync(join(root, rel), 'utf8'))
const catalog = [...readJson('src/data/packs.json'), ...readJson('src/data/singles.json')]

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

function describe(p) {
  const facts =
    p.type === 'pack'
      ? [['Set', p.set], ['Product', p.kind], ['Cards per pack', p.cardsPerPack], ['Condition', p.condition]]
      : [['Set', p.set], ['Card number', p.number], ['Rarity', p.officialRarity || p.rarity], ['Condition', p.condition]]
  const rows = facts.filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => `<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</li>`)
  return `<ul>${rows.join('')}</ul>`
}

function imageUrl(p) {
  if (!p.image) return null
  if (/^https?:\/\//.test(p.image)) return p.image
  return SITE_URL + p.image.split('/').map(encodeURIComponent).join('/')
}

function baseFields(p) {
  return {
    title: p.name,
    descriptionHtml: describe(p),
    vendor: p.seller || 'Gempack TCG',
    productType: p.type === 'pack' ? 'Sealed Pack' : 'Single Card',
    tags: [p.game, p.set, p.rarity, p.condition, p.type, `gempack:${p.id}`].filter(Boolean),
  }
}

const price = (p) => Number(p.price).toFixed(2)

// --- queries --------------------------------------------------------------------------------------

const FIND_PRODUCT = `
  query Find($handle: String!) {
    productByIdentifier(identifier: { handle: $handle }) {
      id
      variants(first: 1) { nodes { id } }
    }
  }`

const CREATE_PRODUCT = `
  mutation Create($input: ProductSetInput!) {
    productSet(synchronous: true, input: $input) {
      product { id }
      userErrors { field message }
    }
  }`

const UPDATE_PRODUCT = `
  mutation Update($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product { id }
      userErrors { field message }
    }
  }`

const UPDATE_PRICE = `
  mutation Price($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      userErrors { field message }
    }
  }`

const PUBLISH = `
  mutation Publish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors { field message }
    }
  }`

async function setup() {
  const data = await admin(`
    query Setup {
      shop { name }
      location { id name }
      publications(first: 50) { nodes { id name } }
    }`)
  const publications = data.publications.nodes.filter((p) => PUBLICATION_MATCH.test(p.name))
  return { shop: data.shop, location: data.location, publications, allPublications: data.publications.nodes }
}

async function pushProduct(p, { location, publications }) {
  const handle = shopifyHandle(p.id)
  const existing = (await admin(FIND_PRODUCT, { handle })).productByIdentifier

  let productId
  let action
  if (!existing) {
    const image = imageUrl(p)
    const input = {
      ...baseFields(p),
      handle,
      status: 'ACTIVE',
      productOptions: [{ name: 'Title', values: [{ name: 'Default Title' }] }],
      variants: [
        {
          optionValues: [{ optionName: 'Title', name: 'Default Title' }],
          price: price(p),
          sku: p.id,
          inventoryPolicy: 'DENY',
          inventoryItem: { tracked: true, requiresShipping: true },
          inventoryQuantities: [{ locationId: location.id, name: 'available', quantity: Math.max(0, p.stock ?? 0) }],
        },
      ],
      ...(image && { files: [{ originalSource: image, contentType: 'IMAGE', alt: p.name }] }),
    }
    const result = (await admin(CREATE_PRODUCT, { input })).productSet
    checkUserErrors(result, 'create')
    productId = result.product.id
    action = `created (stock ${p.stock ?? 0})`
  } else {
    productId = existing.id
    const update = (await admin(UPDATE_PRODUCT, { product: { id: productId, ...baseFields(p) } })).productUpdate
    checkUserErrors(update, 'update')
    const variantId = existing.variants.nodes[0]?.id
    if (variantId) {
      const result = (await admin(UPDATE_PRICE, { productId, variants: [{ id: variantId, price: price(p) }] })).productVariantsBulkUpdate
      checkUserErrors(result, 'price')
    }
    action = 'updated (stock left as is)'
  }

  if (publications.length) {
    const result = (await admin(PUBLISH, { id: productId, input: publications.map((pub) => ({ publicationId: pub.id })) })).publishablePublish
    checkUserErrors(result, 'publish')
  }
  return action
}

// --- run ------------------------------------------------------------------------------------------

async function main() {
  let products = ONLY ? catalog.filter((p) => ONLY.includes(p.id)) : catalog
  if (ONLY) {
    const unknown = ONLY.filter((id) => !catalog.some((p) => p.id === id))
    if (unknown.length) fail(`Unknown product id(s): ${unknown.join(', ')}`)
  }
  products = products.slice(0, LIMIT)

  if (DRY_RUN) {
    console.log(`Dry run: would push ${products.length} product(s) to ${STORE}\n`)
    for (const p of products) console.log(`  ${shopifyHandle(p.id).padEnd(16)} $${price(p).padStart(8)}  stock ${String(p.stock).padStart(3)}  ${p.name}  ${imageUrl(p) ?? '(no image)'}`)
    return
  }

  if (!accessToken) accessToken = await getAccessToken()
  const ctx = await setup()
  console.log(`Store: ${ctx.shop.name} (${STORE})`)
  console.log(`Stock location: ${ctx.location.name}`)
  if (ctx.publications.length) {
    console.log(`Publishing to: ${ctx.publications.map((p) => p.name).join(', ')}`)
  } else {
    console.warn(
      `⚠ No sales channel matched ${PUBLICATION_MATCH}. Found: ${ctx.allPublications.map((p) => p.name).join(', ') || 'none'}.\n` +
        '  Install the Headless channel in Shopify admin, or set SHOPIFY_PUBLICATIONS. Products will be created but\n' +
        '  checkout on the site can\'t see them until they are published to the Headless channel.',
    )
  }
  console.log(`Images from: ${SITE_URL}\n`)

  let failed = 0
  for (const [i, p] of products.entries()) {
    const label = `[${String(i + 1).padStart(3)}/${products.length}] ${p.id} ${p.name}`
    try {
      console.log(`${label}: ${await pushProduct(p, ctx)}`)
    } catch (err) {
      failed++
      console.error(`${label}: FAILED ${err.message}`)
    }
  }
  console.log(`\nDone. ${products.length - failed} ok, ${failed} failed.`)
  if (failed) process.exit(1)
}

main().catch((err) => fail(err.stack || err.message))

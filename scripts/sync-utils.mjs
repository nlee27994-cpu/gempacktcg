// Shared helpers for the card-data sync scripts (sync-pokemon.mjs, sync-mtg.mjs)
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data')
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Free card APIs are often busy: back off and retry on rate limits, server errors and timeouts
export async function getJson(url, headers = {}, attempt = 1) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) }).catch((err) => ({
    ok: false,
    status: 0,
    statusText: err.message,
  }))
  if (res.ok) return res.json()
  if ((res.status === 0 || res.status === 429 || res.status >= 500) && attempt < 5) {
    const wait = 2000 * 2 ** (attempt - 1)
    console.warn(`  ${res.status || 'network error'} (${res.statusText}); retrying in ${wait / 1000}s`)
    await sleep(wait)
    return getJson(url, headers, attempt + 1)
  }
  throw new Error(`${url} -> ${res.status} ${res.statusText}`)
}

// How many cards of each tier to keep per set, picked across the price range for variety
export const PER_SET = { 'Secret Rare': 2, 'Ultra Rare': 2, Rare: 2, Uncommon: 1, Common: 1 }

// Evenly spaced picks from a price-sorted list: the chase card plus cheaper ones
export function spread(list, n) {
  if (list.length <= n) return list
  return Array.from({ length: n }, (_, i) => list[Math.round((i * (list.length - 1)) / Math.max(1, n - 1))])
}

export function pickPerSet(priced) {
  return Object.entries(PER_SET).flatMap(([tier, n]) =>
    spread(priced.filter((x) => x.tier === tier).sort((a, b) => b.price - a.price), n),
  )
}

export function writeSnapshot(file, source, cards) {
  if (cards.length < 20) {
    console.error(`Only ${cards.length} cards came back, so the existing data was left alone. Check your connection and try again.`)
    process.exit(1)
  }
  writeFileSync(join(DATA_DIR, file), JSON.stringify({ syncedAt: new Date().toISOString(), source, cards }, null, 2) + '\n')
  console.log(`Saved ${cards.length} cards to src/data/${file}`)
}

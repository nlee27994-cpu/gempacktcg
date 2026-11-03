// Downloads the card pictures for every synced card into public/card-images/, so the site
// serves them itself (from your own domain) instead of loading them from the Pokémon TCG API's
// image server on every page view. Images already downloaded are skipped.
//
// Usage: npm run fetch-images   (downloads, then rebuilds the catalog to use the local copies)
// Optional arguments for testing: node scripts/fetch-images.mjs <snapshot.json> <output folder>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DATA_DIR, fetchWithRetry } from './sync-utils.mjs'

export const IMAGE_DIR = join(DATA_DIR, '..', '..', 'public', 'card-images')

// One file per card, named after its API id (e.g. sv8pt5-161.png)
export const imageFileFor = (card) => `${card.apiId.replace(/[^\w-]/g, '_')}${extname(new URL(card.image).pathname) || '.png'}`

async function main() {
  const snapshotPath = process.argv[2] ?? join(DATA_DIR, 'pokemon-api.json')
  const outDir = process.argv[3] ?? IMAGE_DIR
  if (!existsSync(snapshotPath)) {
    console.error('No synced card data yet. Run npm run sync:pokemon first.')
    process.exit(1)
  }
  const cards = JSON.parse(readFileSync(snapshotPath, 'utf8')).cards.filter((c) => c.image?.startsWith('http'))
  mkdirSync(outDir, { recursive: true })

  const todo = cards.filter((c) => !existsSync(join(outDir, imageFileFor(c))))
  console.log(`${cards.length} card images, ${cards.length - todo.length} already downloaded, ${todo.length} to fetch`)
  let done = 0
  let failed = 0
  // A few downloads at a time is quick without hammering the image server
  const queue = [...todo]
  const worker = async () => {
    for (let card = queue.shift(); card; card = queue.shift()) {
      try {
        const res = await fetchWithRetry(card.image)
        writeFileSync(join(outDir, imageFileFor(card)), Buffer.from(await res.arrayBuffer()))
        done++
      } catch (err) {
        failed++
        console.warn(`  couldn't download ${card.name}: ${err.message}`)
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker))
  console.log(`Downloaded ${done} images to public/card-images${failed ? `; ${failed} failed (run again to retry)` : ''}`)
}

// Only run when called directly, so generate-data.mjs can import imageFileFor
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()

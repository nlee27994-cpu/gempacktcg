// Downloads the official product photo for each real sealed product (see pack-covers.mjs)
// into public/pack-covers/, so the site serves the official covers itself. Already
// downloaded photos are skipped.
//
// Usage: npm run fetch-covers   (downloads, then rebuilds the catalog to use them)
// Optional for testing: TCGPLAYER_CDN_URL=http://... and an output folder as the first argument
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PACK_COVERS } from './pack-covers.mjs'
import { DATA_DIR, fetchWithRetry } from './sync-utils.mjs'

export const COVER_DIR = join(DATA_DIR, '..', '..', 'public', 'pack-covers')
export const coverFileFor = (id) => `${id}.jpg`

// TCGplayer serves product photos at a few sizes; try the largest first
const CDN = process.env.TCGPLAYER_CDN_URL ?? 'https://tcgplayer-cdn.tcgplayer.com/product'
const candidates = (id) => [`${CDN}/${id}_in_1000x1000.jpg`, `${CDN}/${id}_400w.jpg`, `${CDN}/${id}_200w.jpg`]
const HEADERS = { 'User-Agent': 'Mozilla/5.0 (GempackTCG student demo)', Accept: 'image/*' }

async function download(id, outDir) {
  for (const url of candidates(id)) {
    try {
      const res = await fetchWithRetry(url, HEADERS)
      if (!res.headers.get('content-type')?.startsWith('image/')) continue
      writeFileSync(join(outDir, coverFileFor(id)), Buffer.from(await res.arrayBuffer()))
      return true
    } catch {
      // try the next size
    }
  }
  return false
}

async function main() {
  const outDir = process.argv[2] ?? COVER_DIR
  mkdirSync(outDir, { recursive: true })
  const ids = [
    ...new Set(
      Object.values(PACK_COVERS)
        .flatMap((e) => [e.booster, e.boosterPhoto, e.sleeved, e.blister])
        .filter((id) => typeof id === 'number'),
    ),
  ]
  const todo = ids.filter((id) => !existsSync(join(outDir, coverFileFor(id))))
  console.log(`${ids.length} official covers, ${ids.length - todo.length} already downloaded, ${todo.length} to fetch`)
  let failed = 0
  for (const id of todo) {
    if (!(await download(id, outDir))) {
      failed++
      console.warn(`  couldn't download the photo for TCGplayer product ${id}`)
    }
  }
  console.log(`Downloaded ${todo.length - failed} covers to public/pack-covers${failed ? `; ${failed} failed (run again to retry)` : ''}`)
}

// Only run when called directly, so generate-data.mjs can import coverFileFor
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main()

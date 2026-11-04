// Makes the official pack photos transparent: removes the pure-white background around each
// product and saves public/pack-covers/<id>.png next to the downloaded <id>.jpg.
// Only white that touches the photo's edge is removed, so white printed on the pack (or a
// blister's off-white backing card) stays. Photos with no real background (booster packs are
// cropped to the pack, blisters to their backing card) keep their JPG, which is far smaller.
// PNGs that already exist are skipped.
//
// Usage: npm run cutout-covers   (fetch-covers runs this automatically)
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import jpeg from 'jpeg-js'
import { PNG } from 'pngjs'
import { COVER_DIR } from './fetch-covers.mjs'

const WHITE = 252 // every channel at least this bright...
const GREYISH = 12 // ...and nearly colourless
const EDGE = 8 // pixels from the outline where clear plastic / white fringe is softened
const MIN_HOLE = 0.002 // enclosed white patches at least this share of the photo are holes
const MIN_BACKGROUND = 0.05 // below this share of the photo there's nothing worth removing
const MAX_HEIGHT = 700 // transparent PNGs are shrunk to this height to keep them light

// Shrinks RGBA pixels by averaging each block of source pixels (keeps it sharp, no new deps)
function shrink(src, w, h, maxH) {
  if (h <= maxH) return { data: src, w, h }
  const nh = maxH
  const nw = Math.round((w * nh) / h)
  const out = new Uint8Array(nw * nh * 4)
  for (let y = 0; y < nh; y++) {
    const y0 = Math.floor((y * h) / nh), y1 = Math.max(y0 + 1, Math.floor(((y + 1) * h) / nh))
    for (let x = 0; x < nw; x++) {
      const x0 = Math.floor((x * w) / nw), x1 = Math.max(x0 + 1, Math.floor(((x + 1) * w) / nw))
      const sum = [0, 0, 0, 0]
      let n = 0
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const i = (sy * w + sx) * 4
          // weight colour by alpha so clear pixels don't darken the edge
          const a = src[i + 3]
          sum[0] += src[i] * a; sum[1] += src[i + 1] * a; sum[2] += src[i + 2] * a; sum[3] += a
          n++
        }
      }
      const o = (y * nw + x) * 4
      if (sum[3] > 0) {
        out[o] = sum[0] / sum[3]; out[o + 1] = sum[1] / sum[3]; out[o + 2] = sum[2] / sum[3]
      }
      out[o + 3] = sum[3] / n
    }
  }
  return { data: out, w: nw, h: nh }
}

export function cutout(jpgBuffer) {
  const { width: w, height: h, data } = jpeg.decode(jpgBuffer, { useTArray: true })
  const isWhite = (i) => {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
    return Math.min(r, g, b) >= WHITE && Math.max(r, g, b) - Math.min(r, g, b) <= GREYISH
  }

  // Flood fill the background from every edge pixel
  const bg = new Uint8Array(w * h)
  const stack = []
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x)
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1)
  while (stack.length) {
    const i = stack.pop()
    if (bg[i] || !isWhite(i)) continue
    bg[i] = 1
    const x = i % w
    if (x > 0) stack.push(i - 1)
    if (x < w - 1) stack.push(i + 1)
    if (i >= w) stack.push(i - w)
    if (i < w * (h - 1)) stack.push(i + w)
  }

  const removed = bg.reduce((s, b) => s + b, 0) / (w * h)
  if (removed < MIN_BACKGROUND) return { png: null, removed }

  // Enclosed holes (like a sleeve's hang hole) show the white background too: clear any
  // pure-white patch big enough that it can't be lettering or a highlight on the pack
  const seen = new Uint8Array(w * h)
  for (let start = 0; start < w * h; start++) {
    if (bg[start] || seen[start] || !isWhite(start)) continue
    const patch = []
    const todo = [start]
    seen[start] = 1
    while (todo.length) {
      const i = todo.pop()
      patch.push(i)
      const x = i % w
      for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (n >= 0 && n < w * h && !seen[n] && !bg[n] && isWhite(n)) {
          seen[n] = 1
          todo.push(n)
        }
      }
    }
    if (patch.length >= MIN_HOLE * w * h) for (const i of patch) bg[i] = 1
  }

  // Distance (in pixels, up to EDGE) from each pixel to the background
  const dist = new Uint8Array(w * h).fill(255)
  let frontier = []
  for (let i = 0; i < w * h; i++) if (bg[i]) { dist[i] = 0; frontier.push(i) }
  for (let d = 1; d <= EDGE && frontier.length; d++) {
    const next = []
    for (const i of frontier) {
      const x = i % w
      for (const n of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (n >= 0 && n < w * h && dist[n] === 255) { dist[n] = d; next.push(n) }
      }
    }
    frontier = next
  }

  // Alpha: background is clear. Near the outline, light colourless pixels are clear plastic
  // or leftover white blended into the edge, so the lighter they are, the more see-through.
  const rgba = new Uint8Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
    rgba[i * 4] = r
    rgba[i * 4 + 1] = g
    rgba[i * 4 + 2] = b
    if (bg[i]) continue // alpha stays 0
    const light = Math.min(r, g, b)
    const colourless = Math.max(r, g, b) - light <= 24
    if (dist[i] <= EDGE && colourless && light > 200) rgba[i * 4 + 3] = Math.max(0, Math.min(255, (255 - light) * 4))
    else rgba[i * 4 + 3] = dist[i] <= 1 ? 225 : 255
  }
  const small = shrink(rgba, w, h, MAX_HEIGHT)
  const png = new PNG({ width: small.w, height: small.h })
  png.data.set(small.data)
  return { png: PNG.sync.write(png, { deflateLevel: 9 }), removed }
}

function main() {
  if (!existsSync(COVER_DIR)) {
    console.error('No covers downloaded yet. Run npm run fetch-covers first.')
    process.exit(1)
  }
  const jpgs = readdirSync(COVER_DIR).filter((f) => f.endsWith('.jpg'))
  let made = 0
  let kept = 0
  for (const file of jpgs) {
    const out = join(COVER_DIR, file.replace(/\.jpg$/, '.png'))
    if (existsSync(out)) continue
    const { png, removed } = cutout(readFileSync(join(COVER_DIR, file)))
    if (!png) {
      kept++ // no background to remove: the JPG is used as it is
      continue
    }
    writeFileSync(out, png)
    made++
    console.log(`  ${file}: ${Math.round(removed * 100)}% background removed`)
  }
  console.log(`${made} transparent covers made; ${kept} have no background to remove and keep their JPG`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()

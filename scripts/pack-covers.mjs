// Official product photos for the real sealed products, by TCGplayer product id.
// Found on tcgplayer.com (2026-11-04); each id is the number in the product page's URL,
// e.g. https://www.tcgplayer.com/product/565604/... is the Surging Sparks Booster Pack.
// null = that product doesn't exist for the set (special sets have no sleeved boosters
// or 3-pack blisters), so the catalog doesn't sell it.
// `booster` falls back to `boosterPhoto` when the plain booster pack's own id is unknown.

export const PACK_COVERS = {
  'Prismatic Evolutions': { booster: 593294, sleeved: null, blister: null },
  'Surging Sparks': { booster: 565604, sleeved: 565602, blister: 565635 },
  // Plain booster pack id not found: use the sleeved pack's photo (same pack art)
  'Stellar Crown': { booster: 'unknown', boosterPhoto: 557352, sleeved: 557352, blister: 557337 },
  'Twilight Masquerade': { booster: 543843, sleeved: 544170, blister: 544171 },
  'Scarlet & Violet 151': { booster: 504467, sleeved: null, blister: null },
  // Single 3-pack blister id not found (only the "Set of 2" listing): keeps the drawn cover
  'Obsidian Flames': { booster: 501256, sleeved: 534087, blister: 'unknown' },
  'Paldean Fates': { booster: 528038, sleeved: null, blister: null },
  'Temporal Forces': { booster: 532841, sleeved: 538787, blister: 536229 },
  'Journey Together': { booster: 610935, sleeved: 610934, blister: 610948 },
  'Destined Rivals': { booster: 624683, sleeved: 624684, blister: 625683 },
  'Shrouded Fable': { booster: 552997, sleeved: null, blister: 553007 },
}

// Which photo (TCGplayer id) to show for a product, or null if there isn't one
export function coverIdFor(set, slot) {
  const entry = PACK_COVERS[set]
  if (!entry) return null
  const id = slot === 'booster' && entry.booster === 'unknown' ? entry.boosterPhoto : entry[slot]
  return typeof id === 'number' ? id : null
}

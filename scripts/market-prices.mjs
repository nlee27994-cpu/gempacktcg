// Researched market prices (USD per pack) for sealed Pokémon packs, with where each number came from.
// Gathered 2026-10-22 from public price trackers and retailer listings. Sealed prices move fast,
// so re-check these before relying on them.

const src = (label, url, asOf, note) => ({ label, url, asOf, ...(note && { note }) })

export const PACK_PRICES = {
  // ---------- Pokémon: single booster pack ----------
  'Prismatic Evolutions': { price: 13.85, source: src('PokemonWizard (TCGplayer market)', 'https://www.pokemonwizard.com/products/593294/prismatic-evolutions-booster-pack', '2026-07-10') },
  'Surging Sparks': { price: 8.68, source: src('The Hobby Bin', 'https://thehobbybin.com/products/surging-sparks-booster-pack', '2026-10-15') },
  'Stellar Crown': { price: 10.85, source: src('The Hobby Bin (sleeved pack)', 'https://thehobbybin.com/products/stellar-crown-sleeved-booster-pack', '2026-10-16') },
  'Twilight Masquerade': { price: 8.42, source: src('PokeInvesting (updated daily)', 'https://pokeinvesting.com/sealed/twilight-masquerade-booster-pack', '2026-10') },
  'Scarlet & Violet 151': {
    price: 31.79,
    source: src('PokeInvesting (updated daily)', 'https://pokeinvesting.com/sealed/151-booster-pack', '2026-10', 'Other listings were as low as $12–13, so this one is uncertain'),
  },
  'Obsidian Flames': { price: 12.36, source: src('The Hobby Bin', 'https://thehobbybin.com/products/obsidian-flames-booster-packs', '2026-10-17') },
  'Paldean Fates': { price: 23.99, source: src('PackMagik', 'https://www.packmagik.com/products/pkmn-prod-6276913', '2026-07') },
  'Temporal Forces': { price: 11.65, source: src('The Hobby Bin (sleeved pack)', 'https://thehobbybin.com/products/temporal-forces-sleeved-booster-pack', '2026-10-17') },
  'Journey Together': { price: 6.77, source: src('PokemonWizard (TCGplayer market)', 'https://www.pokemonwizard.com/products/610935/journey-together-booster-pack', '2026') },
  'Destined Rivals': {
    price: 9.46,
    sleeved: 12.74,
    source: src('PokemonWizard (TCGplayer market)', 'https://www.pokemonwizard.com/products/624683/destined-rivals-booster-pack', '2026'),
  },
  'Shrouded Fable': { price: 13.95, source: src('PackMagik', 'https://www.packmagik.com/products/pkmn-prod-7108652', '2026-07-14') },
}

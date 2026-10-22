// Researched market prices (USD per pack) for sealed products, with where each number came from.
// Gathered 2026-10-22 from public price trackers and retailer listings. Sealed prices move fast,
// so re-check these before relying on them. Box prices are divided by packs per box.
// Japanese prices convert at ¥152 per US dollar.

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

  // ---------- Magic: The Gathering: play booster + collector booster ----------
  Bloomburrow: {
    price: 5.49,
    collector: 20.83,
    source: src('The Card Shop Finder (play box $190–205 ÷ 36)', 'https://thecardshopfinder.com/shop/mtg/sealed/bloomburrow/', '2026-09'),
    collectorSource: src('Knight and Day Games (collector box $249.99 ÷ 12)', 'https://knightanddaygames.com/products/magic-the-gathering-bloomburrow-collector-booster-box', 'undated'),
  },
  Duskmourn: {
    price: 4.51,
    collector: 18.33,
    source: src('The Card Shop Finder (play box ~$162 ÷ 36)', 'https://thecardshopfinder.com/shop/mtg/sealed/duskmourn-house-of-horror/', '2026-09'),
    collectorSource: src('Knight and Day Games (collector box $219.99 ÷ 12)', 'https://knightanddaygames.com/products/magic-the-gathering-duskmourn-house-of-horror-collector-booster-box', 'undated'),
  },
  Foundations: {
    price: 4.51,
    collector: 61.04,
    source: src('The Card Shop Finder (play box ~$162 ÷ 36)', 'https://thecardshopfinder.com/shop/mtg/sealed/foundations/', '2026-09'),
    collectorSource: src('The Card Shop Finder (collector box ~$732 ÷ 12)', 'https://thecardshopfinder.com/shop/mtg/sealed/foundations/', '2026-09'),
  },
  Aetherdrift: {
    price: 4.99,
    collector: 24.5,
    source: { label: 'Estimate: no play booster price found, so this uses a typical play booster price', estimate: true },
    collectorSource: src('PriceCharting (sold packs $24–25)', 'https://www.pricecharting.com/game/magic-aetherdrift/booster-pack-collector', '2026-07-12'),
  },
  'Tarkir: Dragonstorm': {
    price: 3.61,
    collector: 28.33,
    source: src('Poke-Collect (play box $129.95 ÷ 36)', 'https://poke-collect.com/en-gb/products/magic-the-gathering-tarkir-dragonstorm-play-booster-box', 'undated'),
    collectorSource: src('Retrofix / eBay (collector box $310–370 ÷ 12)', 'https://www.retrofixgames.com/products/mtg-tarkir-dragonstorm-collector-booster-box', 'undated'),
  },
  'Final Fantasy': {
    price: 16.67,
    collector: 145.83,
    source: src('The Card Shop Finder (play box $500–700 ÷ 36)', 'https://thecardshopfinder.com/shop/mtg/sealed/final-fantasy/', '2026-09'),
    collectorSource: src('The Card Shop Finder (collector box $1,500–2,000 ÷ 12)', 'https://thecardshopfinder.com/shop/mtg/sealed/final-fantasy/', '2026-09'),
  },
  'Edge of Eternities': {
    price: 6.31,
    collector: 63.5,
    source: src('Out of Games (TCGplayer market)', 'https://outof.games/realms/mtg/products/edge-of-eternities-play-booster-pack/', '2026'),
    collectorSource: src('Out of Games (market price)', 'https://outof.games/realms/mtg/products/edge-of-eternities-play-booster-pack/', '2026'),
  },

  // ---------- One Piece: English booster pack + Japanese booster pack ----------
  'Romance Dawn (OP-01)': {
    price: 13,
    japanese: 10.96,
    source: src('Search summary of retail listings (low-to-mid teens)', null, '2026', 'Low confidence: first-print English boxes trade far higher'),
    japaneseSource: src('Samurai Sword Tokyo (JP box median ¥40,000 ÷ 24)', 'https://samuraiswordtokyo.com/id/tcg-index/cards/one-piece-card-game-booster-pack-romance-dawn-box-0f2f2c', '2026-07-23'),
  },
  'Awakening of the New Era (OP-05)': {
    price: 7.92,
    japanese: 20.15,
    source: src('eBay UK sold box (£149.99 ÷ 24)', 'https://www.ebay.de/itm/277125348749', 'undated'),
    japaneseSource: src('Samurai Sword Tokyo (JP box median ¥73,500 ÷ 24)', 'https://samuraiswordtokyo.com/products/op05box', '2026-07-21'),
  },
  'Wings of the Captain (OP-06)': {
    price: 6.46,
    japanese: 6.85,
    source: src('eBay listings (sealed box ~$155 ÷ 24)', 'https://www.ebay.de/itm/257096336328', 'undated'),
    japaneseSource: src('Samurai Sword Tokyo (JP box ¥25,000 ÷ 24)', 'https://www.samuraiswordtokyo.com/products/op06box', '2026-09-09'),
  },
  '500 Years in the Future (OP-07)': {
    price: 6.17,
    japanese: 1.87,
    source: src('eBay sold boxes ($146–150 ÷ 24)', 'https://www.ebay.de/itm/156765422301', '2025-09'),
    japaneseSource: src('eBay sold JP box ($44.99 ÷ 24)', 'https://www.ebay.de/itm/116743179021', '2025-08'),
  },
  'Two Legends (OP-08)': {
    price: 9.52,
    japanese: 3.84,
    source: src('PriceCharting (sold packs)', 'https://www.pricecharting.com/game/one-piece-two-legends/booster-pack', '2026-07'),
    japaneseSource: src('Samurai Sword Tokyo (JP box median ¥13,990 ÷ 24)', 'https://samuraiswordtokyo.com/id/tcg-index/cards/one-piece-card-game-booster-pack-two-legends-box-063490', '2026-07-26'),
  },
  'Emperors in the New World (OP-09)': {
    price: 9,
    japanese: 1.45,
    source: src('eBay listings ($7.49–11 per pack)', 'https://www.ebay.com/itm/335959642217', '2026'),
    japaneseSource: { label: 'Estimate: no market price found, so this uses the Japanese retail price of ¥220', estimate: true },
  },
  'Memorial Collection (EB-01)': {
    price: 32.99,
    japanese: 5.33,
    source: src('eBay sold 4-pack lot ($131.94 ÷ 4)', 'https://www.ebay.de/itm/306187441647', 'undated'),
    japaneseSource: src('Samurai Sword Tokyo (JP box ¥19,732 ÷ 24)', 'https://samuraiswordtokyo.com/de/blogs/news/eb-01-memorial-collection-booster-box-buying-guide', '2026-10-02'),
  },
}

// Real One Piece chase cards (raw, ungraded). No free API covers One Piece prices.
export const ONE_PIECE_CHASE = [
  { name: 'Roronoa Zoro (Manga Rare)', set: 'Wings of the Captain (OP-06)', number: 'OP06-118', marketPrice: 2284, source: src('Samurai Sword Tokyo', 'https://samuraiswordtokyo.com/blogs/news/op-06-wings-of-the-captain-best-cards', '2026-03') },
  { name: 'Monkey.D.Luffy (Manga Rare)', set: 'Awakening of the New Era (OP-05)', number: 'OP05-119', marketPrice: 1700, source: src('CardGamer (average sale)', 'https://cardgamer.com/games/one-piece/most-valuable-one-piece-op05-cards/', 'undated') },
  { name: 'Shanks (Manga Rare)', set: 'Romance Dawn (OP-01)', number: 'OP01-120', marketPrice: 1500, source: src('Samurai Sword Tokyo', 'https://samuraiswordtokyo.com/blog/op-01-romance-dawn-best-cards-pull-rates', '2026') },
  { name: 'Boa Hancock (Manga Alt Art)', set: '500 Years in the Future (OP-07)', number: 'OP07-051', marketPrice: 1046, source: src('Japan Figure', 'https://japan-figure.com/blogs/news/op07-card-list', 'undated', 'The page lists inconsistent prices for this card') },
  { name: 'Trafalgar Law (Manga Super Rare)', set: 'Awakening of the New Era (OP-05)', number: 'OP05-069', marketPrice: 632, source: src('CardGamer (average sale)', 'https://cardgamer.com/games/one-piece/most-valuable-one-piece-op05-cards/', 'undated') },
  { name: 'Tony Tony.Chopper (Manga Alt Art)', set: 'Memorial Collection (EB-01)', number: 'EB01-006', marketPrice: 405, source: src('Japan Figure', 'https://japan-figure.com/th/blogs/news/eb01-card-list', 'undated') },
  { name: 'Mr.2.Bon.Kurei (Bentham) (Alt Art)', set: 'Memorial Collection (EB-01)', number: 'EB01-061', marketPrice: 35.9, ultra: true, source: src('Japan Figure', 'https://japan-figure.com/th/blogs/news/eb01-card-list', 'undated') },
  { name: 'Charlotte Flampe (SP)', set: 'Memorial Collection (EB-01)', number: 'EB01-056', marketPrice: 35.03, ultra: true, source: src('Japan Figure', 'https://japan-figure.com/th/blogs/news/eb01-card-list', 'undated') },
  { name: 'Kaku', set: '500 Years in the Future (OP-07)', number: 'OP07-080', marketPrice: 16, ultra: true, source: src('PriceCharting (near-mint sales $11–22)', 'https://www.pricecharting.com/game/6905586', '2026-06') },
]

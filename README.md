# Gempack TCG — demo storefront

A front-end demo for **Gempack TCG**, a trading card marketplace for Pokémon, Magic: The Gathering and One Piece.
Built as a high school business project by **Mason Do, Nicholas Lee and Rachel Lim**.

> **Mission:** Sell cards to Pokémon card enjoyers, direct or through other vendors.

Every pack shows a **price floor**: the minimum card value you're guaranteed. If your pulls come in under it, the
difference is credited back. You get the thrill of the pull with a clear safety net.

This is a demo. All products are mock data, nothing is stored on a server, and checkout takes no real payment.

## Features

| Page | What it does |
| --- | --- |
| **Home** (`/`) | Hero, featured rare-card drops with live countdowns, upcoming events banner, Gempack Series drops |
| **Shop** (`/shop`) | 102 packs + 120 singles (more once card data is synced). Search, filter by type / game / rarity / source / price, sort. Filters live in the URL, so filtered views can be shared |
| **Product** (`/product/:id`) | Card or pack details. Packs show the price floor, hit slots and pull odds. Series packs show the drop's full checklist and how many of each card are still sealed |
| **Rip a pack** (`/open/:id`) | Pack-tearing animation, tap-to-flip card reveal weighted by rarity, then pulled value vs. pack price and floor |
| **Auction House** (`/auctions`) | Live auctions for single cards from Gempack (Official) and verified collectors. Bid, Buy Now, track your bids and wins, or get verified and list your own card |
| **Auction** (`/auctions/:id`) | Countdown, minimum raise, quick bids, Buy Now, bid history, and pay-to-claim when you win |
| **Cart / Checkout** | Cart (saved in the browser), fake checkout form, order confirmation |
| **About** (`/about`) | Mission, team, strategy, and how the price floor works |
| **Dev Console** (`/admin`) | Staff view: every transaction with a unique number and full data, live inventory, Series drops, auctions, exports and demo resets |

## Getting started

You need [Node.js](https://nodejs.org/) 18 or newer.

```bash
npm install       # install dependencies
npm run dev       # start the dev server at http://localhost:5173
```

Other commands:

```bash
npm run build          # production build into dist/
npm run preview        # serve the production build locally
npm run generate-data  # regenerate the mock catalog in src/data/
npm run sync:pokemon   # pull real Pokémon cards and prices, then regenerate (see below)
npm run sync:mtg       # pull real Magic cards and prices from Scryfall, then regenerate
```

## Project structure

```
├─ index.html
├─ public/favicon.svg            # gem-shaped booster pack logo
├─ scripts/
│  ├─ generate-data.mjs          # builds the catalog (seeded, so it's reproducible)
│  ├─ market-prices.mjs          # researched sealed + One Piece prices, with sources
│  ├─ sync-pokemon.mjs           # real Pokémon cards + prices (Pokémon TCG API)
│  ├─ sync-mtg.mjs               # real Magic cards + prices (Scryfall)
│  └─ sync-utils.mjs             # shared download helpers
└─ src/
   ├─ App.jsx                    # routes
   ├─ main.jsx                   # entry: router + cart, auction and series providers
   ├─ index.css                  # Tailwind + button/panel styles + holo shimmer
   ├─ data/                      # packs, singles, series, auctions, events (generated)
   ├─ lib/
   │  ├─ catalog.js              # loads the JSON, lookups, featured drops
   │  ├─ packEngine.js           # pull odds, pack opening, price-floor solver (pure JS)
   │  ├─ packOpening.js          # the engine bound to the app's catalog
   │  ├─ auction.js              # auction rules: bid increments, fees, durations
   │  ├─ series.js               # Gempack Series drop status
   │  ├─ rarity.js               # rarity tiers ↔ gem colors
   │  └─ format.js, useNow.js
   ├─ context/                   # CartContext, AuctionContext, SeriesContext
   ├─ components/                # Navbar, Footer, Logo, CardArt, ProductCard, badges, filters…
   └─ pages/                     # Home, Shop, Product, OpenPack, AuctionHouse, AuctionDetail, Cart, …
```

## Real Pokémon card data

The Pokémon side of the catalog can use real cards from the free [Pokémon TCG API](https://pokemontcg.io):
real names, card numbers, official rarities, card images and TCGplayer market prices.

```bash
npm run sync:pokemon
```

This downloads the 11 Scarlet & Violet sets the shop uses. It keeps 8 cards per set (2 Secret Rare tier, 2 Ultra
Rare, 2 Rare, 1 Uncommon, 1 Common), picked across the price range, and saves them to `src/data/pokemon-api.json`.
Then it rebuilds the catalog, so packs, drops, floors and auctions all use the real cards and prices. Commit
`pokemon-api.json` so teammates get the same cards without syncing.

- **Official rarities map to the site's gem tiers.** Special Illustration Rare and Hyper Rare become Secret Rare.
  Illustration Rare and Ultra Rare become Ultra Rare. Double Rare and ACE SPEC become Rare.
- **Prices** use each card's TCGplayer market price. Product pages show the official rarity, when the price was
  updated, and a link to TCGplayer.
- **Rate limits:** the API works without a key. For higher limits, get a free key at pokemontcg.io and run
  `POKEMONTCG_API_KEY=your-key npm run sync:pokemon`. The script retries when the API is busy.
- Run it again any time to refresh prices. If too few cards come back (no internet, say), the existing data is left
  alone. Delete `src/data/pokemon-api.json` and run `npm run generate-data` to go back to the built-in card list.
- Card images are © The Pokémon Company and are loaded from the API's image server. That's fine for a class demo,
  but a real store would need permission. If an image can't load, the card falls back to the drawn art.

## Real Magic card data

`npm run sync:mtg` does the same for Magic, using [Scryfall](https://scryfall.com/docs/api) (free, no key needed).
It saves `src/data/mtg-api.json` for the 7 Magic sets the shop uses. Scryfall's USD prices are TCGplayer market
prices, updated daily. Special printings (borderless, showcase, extended art, serialized, fancy foils) count as the
Secret Rare tier, mythics as Ultra Rare.

## Where prices come from

Every product page says where its price comes from:

- **Market price, live:** Pokémon and Magic singles, once synced. These are TCGplayer market prices from the Pokémon
  TCG API and Scryfall.
- **Market price, researched:** sealed packs and One Piece chase cards (manga rares and so on). They were looked up
  from public price trackers on 2026-10-22, and `scripts/market-prices.mjs` lists each one with its source link and
  date. Sealed prices move fast, so re-check them before relying on them. Some are low-confidence and say so.
- **Gempack product:** Series drops and Gempack Hit Packs are priced from the market value of the cards inside them.
- **Estimate:** anything without a source, labelled on the page. This covers One Piece commons and uncommons, plus the
  built-in Pokémon and Magic cards until you run the syncs. Pack types with no market price of their own also follow
  a stated rule: a 3-pack blister is 3 boosters + $2, and a prerelease pack is 6 play boosters + $5.

Other rules:

- Singles are listed at market value for their condition. Lightly Played is 85% of Near Mint and Moderately Played
  is 65%. There are no random markups.
- The catalog only lists raw (ungraded) cards, because graded prices vary too much from card to card to estimate.
  Sellers can still list PSA cards in the Auction House, where the value shown is marked as a rough estimate.
- Every pack type is a real product, except the clearly labelled Gempack ones.


## Data model

Every product has `name`, `game`, `set`, `rarity`, `condition`, `price` and `source`
(`Direct`, `Vendor` or `Collector`), plus a `seller`. `Collector` listings are fixed-price cards from verified collectors.

- **Singles** add `marketPrice` (near-mint raw value), a card `number` and a `priceSource`.
- **Packs** add `priceFloor`, `cardsPerPack` and `hitSlots`. For packs, `rarity` is the *guaranteed hit*,
  for example "Rare or better".

To change the catalog, edit `scripts/generate-data.mjs` and run `npm run generate-data`.

## How the pack math works

The pack engine (`src/lib/packEngine.js`) is shared by the app and the data generator:

1. **Odds.** Filler slots are Common or Uncommon. Hit slots are calibrated so the average pull matches what real packs
   return: about **30% of the price** for store packs. Price trackers put real packs at 17–27%. For example,
   PackMagik (mid-2026) has Destined Rivals at $3.09 of card value on an $11.50 pack. Gempack's own Hit Packs return
   86%. Within a rarity tier, expensive chase cards are rarer, and cards from the pack's own set come up more often.
2. **Floors.** The generator simulates 1,500 openings for each pack and picks the highest floor whose expected
   store-credit payout stays under 6% of the price.
3. **Result.** Store packs pay back about 35–45% of their price once floor credit is counted. That's realistic, and
   it's the point of the pitch: Gempack's own Series drops (90%) and Hit Packs (86%) are the fair way to rip.
   Packs whose card values are still estimates (Magic and One Piece before syncing) can come out higher, because
   cheap boosters with lots of bulk cards really do return more.

## Gempack Series drops

The Gempack-built packs (Emerald, Amethyst and Gold, for each game) work differently. They are finite **drops**, with
the data in `src/data/series.json`:

- Each drop has a fixed print run: 60 Emerald, 30 Amethyst or 20 Gold packs.
- The generator writes a **checklist** for each drop. Its total card value is 90% of what the whole drop sells for.
  The biggest chase card that fits the budget goes in first.
- Every checklist copy is sealed into exactly one pack. Bigger cards go into the weakest packs first, so the worst pack
  is as strong as it can be. **Open every pack and you get every card.**
- The price floor is exact: it's the value of the weakest pack in the drop.
- Ripping a series pack opens a random sealed pack from that drop. The product page shows what's still sealed
  ("2 of 3 left") and the live chance that the next pack has a Secret Rare. Progress is saved in your browser, and
  each drop has a "Reset this drop" button for demos.

## Auction House

Modelled on the auction houses in sports games like EA Sports FC and Madden:

- **Sellers:** only Gempack staff (**Official** badge) and **verified** collectors can list. Visitors get verified on the
  Sell tab, with a simulated ID check and an agreement to ship sold cards to Gempack for authentication.
- **Listings** have a starting price, an optional **Buy Now** price and a duration, from 5 minutes (for demos) to 3 days.
  Sellers pay a **5% fee** on the sale, and the form shows the payout before you list.
- **Bidding:** each bid must beat the current one by a minimum raise that grows with the price ($0.50 under $10, up
  to $25 over $1,000). You can't bid on your own listing or outbid yourself, and a bid at or above Buy Now buys the
  card outright.
- **Rival bidders are simulated.** They often answer your bid within a few seconds, bid in the background (mostly on
  auctions ending soon and on your listings), and stop around what a card is worth. You get a notice when you're
  outbid, win, or sell.
- **Winning:** a won card goes to the cart at the winning price and is marked paid after checkout.
- The rules are in `src/lib/auction.js`, the live state is in `src/context/AuctionContext.jsx`, and the 36 starting
  listings are generated into `src/data/auctions.json`. State is saved in your browser, and the Auction House starts
  fresh once every listing has ended. My activity has a reset button for demos.

## Dev Console

`/admin` (linked in the footer as "Dev console (staff)") is the staff view of the store.

- **Transactions:** every event gets a unique transaction number such as `TX-20261022-000042` (date + counter). The
  counter never repeats, even after the ledger is cleared. Recorded events:
  - orders, with items, customer and totals
  - pack rips and drop openings, with every card pulled, its value and any floor credit
  - bids, from you and the simulated rivals
  - Buy Nows and finished auctions, with the winner, price and Gempack's revenue
  - new listings, seller verifications and claimed auction wins

  Click a row for the full record as JSON. You can search across all data, filter by type or by who did it, and export
  as CSV or JSON.
- **Inventory:** every product with its starting stock, units sold and units available. Purchases now reduce stock
  across the whole site. There are also tabs for Series drop progress and all auctions.
- **Overview:** gross sales, units sold, packs ripped, floor credit paid out, auction sales and revenue, low stock and
  inventory value.
- **Tools:** download the full ledger, clear it, reset the Auction House, refill all drops.

The ledger is in `src/context/LedgerContext.jsx`. It's saved in the browser (newest 2,000 transactions), so each
browser has its own history. A real store would put this behind a staff login and write transactions to a database.

## Branding

- **Colors:** deep navy base, with gem accents that also mark rarity:
  Common = quartz (slate), Uncommon = emerald, Rare = sapphire, Ultra Rare = amethyst, Secret Rare = gold.
- **Logo:** a faceted gemstone in the shape of a crimped booster pack (`src/components/Logo.jsx`).
- **Type:** Space Grotesk for headings, Inter for body text.

## Tech

React 18, Vite 5, Tailwind CSS 3, React Router 6. No backend: all data is in local JSON files. Card art is drawn with
CSS gradients and inline SVG, so no licensed images are used.

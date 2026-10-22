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
| **Shop** (`/shop`) | 109 packs + 117 singles. Search, filter by type / game / rarity / source / price, sort. Filters live in the URL, so filtered views can be shared |
| **Product** (`/product/:id`) | Card or pack details. Packs show the price floor, hit slots and pull odds. Series packs show the drop's full checklist and how many of each card are still sealed |
| **Rip a pack** (`/open/:id`) | Pack-tearing animation, tap-to-flip card reveal weighted by rarity, then pulled value vs. pack price and floor |
| **Auction House** (`/auctions`) | Live auctions for single cards from Gempack (Official) and verified collectors. Bid, Buy Now, track your bids and wins, or get verified and list your own card |
| **Auction** (`/auctions/:id`) | Countdown, minimum raise, quick bids, Buy Now, bid history, and pay-to-claim when you win |
| **Cart / Checkout** | Cart (saved in the browser), fake checkout form, order confirmation |
| **About** (`/about`) | Mission, team, strategy, and how the price floor works |

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
```

## Project structure

```
├─ index.html
├─ public/favicon.svg            # gem-shaped booster pack logo
├─ scripts/generate-data.mjs     # builds the mock catalog (seeded, so it's reproducible)
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

Magic and One Piece still use the built-in list. Scryfall (scryfall.com) could do the same for Magic.

## Data model

Every product has `name`, `game`, `set`, `rarity`, `condition`, `price` and `source`
(`Direct`, `Vendor` or `Collector`), plus a `seller`. `Collector` listings are fixed-price cards from verified collectors.

- **Singles** add `marketPrice` (near-mint raw value) and a card `number`. Graded copies (PSA 9/10) sell above market.
- **Packs** add `priceFloor`, `cardsPerPack` and `hitSlots`. For packs, `rarity` is the *guaranteed hit*,
  for example "Rare or better".

To change the catalog, edit `scripts/generate-data.mjs` and run `npm run generate-data`.

## How the pack math works

The pack engine (`src/lib/packEngine.js`) is shared by the app and the data generator:

1. **Odds.** Filler slots are Common or Uncommon. Hit slots are calibrated for each pack so the average pull is about
   86% of the pack price. Within a rarity tier, expensive chase cards are rarer, and cards from the pack's own set come
   up more often.
2. **Floors.** The generator simulates 1,500 openings for each pack and picks the highest floor whose expected
   store-credit payout stays under 6% of the price.
3. **Result.** Pulls plus floor credit return roughly 84–111% of the price, about 92% on average. The store keeps a
   margin and buyers never lose more than the floor allows.

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

## Branding

- **Colors:** deep navy base, with gem accents that also mark rarity:
  Common = quartz (slate), Uncommon = emerald, Rare = sapphire, Ultra Rare = amethyst, Secret Rare = gold.
- **Logo:** a faceted gemstone in the shape of a crimped booster pack (`src/components/Logo.jsx`).
- **Type:** Space Grotesk for headings, Inter for body text.

## Tech

React 18, Vite 5, Tailwind CSS 3, React Router 6. No backend: all data is in local JSON files. Card art is drawn with
CSS gradients and inline SVG, so no licensed images are used.

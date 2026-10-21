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
| **Home** (`/`) | Hero, featured rare-card drops with live countdowns, upcoming events banner, Gempack Mystery Packs |
| **Shop** (`/shop`) | 109 packs + 117 singles. Search, filter by type / game / rarity / source / price, sort. Filters live in the URL, so filtered views can be shared |
| **Product** (`/product/:id`) | Card or pack details. Packs show the price floor, hit slots and pull odds |
| **Rip a pack** (`/open/:id`) | Pack-tearing animation, tap-to-flip card reveal weighted by rarity, then pulled value vs. pack price and floor |
| **Consign** (`/consign`) | Form for collectors to submit a card, with a payout estimate. Submissions live in React state only |
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
```

## Project structure

```
├─ index.html
├─ public/favicon.svg            # gem-shaped booster pack logo
├─ scripts/generate-data.mjs     # builds the mock catalog (seeded, so it's reproducible)
└─ src/
   ├─ App.jsx                    # routes
   ├─ main.jsx                   # entry: router + cart/consign providers
   ├─ index.css                  # Tailwind + button/panel styles + holo shimmer
   ├─ data/                      # packs.json, singles.json, events.json (generated)
   ├─ lib/
   │  ├─ catalog.js              # loads the JSON, lookups, featured drops
   │  ├─ packEngine.js           # pull odds, pack opening, price-floor solver (pure JS)
   │  ├─ packOpening.js          # the engine bound to the app's catalog
   │  ├─ rarity.js               # rarity tiers ↔ gem colors
   │  └─ format.js, useNow.js
   ├─ context/                   # CartContext, ConsignContext
   ├─ components/                # Navbar, Footer, Logo, CardArt, ProductCard, badges, filters…
   └─ pages/                     # Home, Shop, Product, OpenPack, Consign, Cart, Checkout, …
```

## Data model

Every product has `name`, `game`, `set`, `rarity`, `condition`, `price` and `source`
(`Direct`, `Vendor` or `Consignment`), plus a `seller`.

- **Singles** add `marketPrice` (near-mint raw value) and a card `number`. Graded copies (PSA 9/10) sell above market.
- **Packs** add `priceFloor`, `cardsPerPack` and `hitSlots`. For packs, `rarity` is the *guaranteed hit*,
  for example "Rare or better".

To change the catalog, edit `scripts/generate-data.mjs` and run `npm run generate-data`.

## How the pack math works

The pack engine (`src/lib/packEngine.js`) is shared by the app and the data generator:

1. **Odds.** Filler slots are Common or Uncommon. Hit slots are calibrated for each pack so the average pull is about
   86% of the pack price (88% for Gempack Mystery Packs). Within a rarity tier, expensive chase cards are rarer, and
   cards from the pack's own set come up more often.
2. **Floors.** The generator simulates 1,500 openings for each pack and picks the highest floor whose expected
   store-credit payout stays under 6% of the price (12% for Mystery Packs).
3. **Result.** Pulls plus floor credit return roughly 84–111% of the price, about 92% on average. The store keeps a
   margin and buyers never lose more than the floor allows.

## Branding

- **Colors:** deep navy base, with gem accents that also mark rarity:
  Common = quartz (slate), Uncommon = emerald, Rare = sapphire, Ultra Rare = amethyst, Secret Rare = gold.
- **Logo:** a faceted gemstone in the shape of a crimped booster pack (`src/components/Logo.jsx`).
- **Type:** Space Grotesk for headings, Inter for body text.

## Tech

React 18, Vite 5, Tailwind CSS 3, React Router 6. No backend: all data is in local JSON files. Card art is drawn with
CSS gradients and inline SVG, so no licensed images are used.

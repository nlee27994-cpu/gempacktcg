// Auction rules shared by the app and scripts/generate-data.mjs (pure, no app imports)

export const SELLER_FEE = 0.05

export const DURATIONS = [
  { label: '5 minutes (demo)', minutes: 5 },
  { label: '1 hour', minutes: 60 },
  { label: '3 hours', minutes: 180 },
  { label: '12 hours', minutes: 720 },
  { label: '1 day', minutes: 1440 },
  { label: '3 days', minutes: 4320 },
]

// Minimum raise steps up with the price, like a game auction house
export function bidIncrement(price) {
  if (price < 10) return 0.5
  if (price < 50) return 1
  if (price < 200) return 5
  if (price < 1000) return 10
  return 25
}

const round2 = (n) => Math.round(n * 100) / 100

export const minNextBid = (auction) =>
  auction.bidCount === 0 ? auction.startPrice : round2(auction.currentBid + bidIncrement(auction.currentBid))

export function formatCountdown(ms) {
  if (ms <= 0) return 'Ended'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  return `${m}m ${String(s % 60).padStart(2, '0')}s`
}

// What a copy is worth relative to its near-mint raw market price
export const CONDITION_VALUE = {
  'Near Mint': 1,
  'Lightly Played': 0.85,
  'Moderately Played': 0.65,
  'PSA 9': 1.7,
  'PSA 10': 3.2,
}

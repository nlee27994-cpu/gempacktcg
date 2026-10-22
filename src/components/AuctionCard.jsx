import { Link } from 'react-router-dom'
import AuctionStatus from './AuctionStatus'
import CardArt from './CardArt'
import RarityBadge from './RarityBadge'
import SellerBadge from './SellerBadge'
import { YOU, auctionCard, finalPrice, isEnded, viewerStatus } from '../context/AuctionContext'
import { formatCountdown } from '../lib/auction'
import { formatPrice } from '../lib/format'

export default function AuctionCard({ auction, now }) {
  const card = auctionCard(auction)
  const ended = isEnded(auction, now)
  const left = auction.endsAt - now
  const urgent = !ended && left < 5 * 60 * 1000
  const status = viewerStatus(auction, now)

  return (
    <Link to={`/auctions/${auction.id}`} className="panel group flex flex-col p-3 transition hover:-translate-y-1 hover:border-gold-400/50">
      <div className="relative px-2 pt-1">
        <CardArt product={card} />
        {status && (
          <span className="absolute left-0 top-0">
            <AuctionStatus status={status} />
          </span>
        )}
      </div>
      <div className="mt-3 flex flex-1 flex-col gap-1.5">
        <RarityBadge rarity={card.rarity} />
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{card.name}</h3>
        <p className="text-xs text-slate-400">{card.condition}</p>
        <SellerBadge seller={auction.seller} type={auction.sellerType} you={auction.seller === YOU} />
        <div className="mt-auto grid grid-cols-2 gap-1 pt-2 text-xs">
          <div>
            <p className="text-slate-400">{ended ? 'Final' : auction.bidCount ? `Bid (${auction.bidCount})` : 'Starting'}</p>
            <p className="font-display text-base font-bold">
              {formatPrice(ended ? finalPrice(auction) : auction.bidCount ? auction.currentBid : auction.startPrice)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-400">Buy Now</p>
            <p className="font-display text-base font-bold text-gold-300">{auction.buyNow ? formatPrice(auction.buyNow) : '—'}</p>
          </div>
        </div>
        <p className={`text-xs font-semibold tabular-nums ${ended ? 'text-slate-500' : urgent ? 'text-rose-400' : 'text-slate-300'}`}>
          ⏱ {ended ? 'Ended' : formatCountdown(left)}
        </p>
      </div>
    </Link>
  )
}

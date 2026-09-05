import Link from "next/link";
import { listingMeta } from "@/lib/constants";
import { FavoriteButton } from "@/components/FavoriteButton";
import { AuctionCountdown } from "@/components/AuctionCountdown";

type ListingCardProps = {
  id: string;
  title: string;
  game: string;
  cardType: string;
  condition: string;
  priceHkd: number;
  images: string[];
  status?: string;
  sellerName?: string;
  href?: string;
  priceLabel?: string;
  badge?: string;
  favorited?: boolean;
  showFavorite?: boolean;
  favoriteAuction?: boolean;
  endsAt?: string | Date;
};

export function ListingCard({
  id,
  title,
  game,
  cardType,
  condition,
  priceHkd,
  images,
  status,
  sellerName,
  href,
  priceLabel,
  badge,
  favorited = false,
  showFavorite = false,
  favoriteAuction = false,
  endsAt,
}: ListingCardProps) {
  const cover = images[0];

  return (
    <div className="relative">
    <Link
      href={href ?? `/listings/${id}`}
      className="group block overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[4/5] bg-[var(--chip)]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={title} className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full place-items-center px-4 text-center text-sm font-bold text-[var(--muted)]">
            {title}
          </div>
        )}
        {(badge || endsAt || status === "SOLD" || status === "HIDDEN" || status === "RESERVED") && (
          <span className="absolute left-3 top-3 rounded-full bg-black/75 px-2 py-1 text-xs font-bold text-[var(--accent)]">
            {endsAt ? <AuctionCountdown endsAt={endsAt} /> : badge ?? (status === "SOLD" ? "已售" : status === "RESERVED" ? "已保留" : "隱藏")}
          </span>
        )}
      </div>
      <div className="space-y-1 p-3">
        <div className="text-lg font-black text-[var(--accent)]">{priceLabel ?? `HK$${priceHkd}`}</div>
        <div className="line-clamp-2 text-sm font-semibold">{title}</div>
        <div className="text-xs text-[var(--muted)]">
          {listingMeta(game, cardType, condition)}
          {sellerName ? ` · ${sellerName}` : ""}
        </div>
      </div>
    </Link>
    {showFavorite && (
      <FavoriteButton
        listingId={favoriteAuction ? undefined : id}
        auctionId={favoriteAuction ? id : undefined}
        initialFavorited={favorited}
        className="absolute right-2 top-2 z-10"
      />
    )}
    </div>
  );
}

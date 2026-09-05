import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUS } from "@/lib/constants";
import { USER_STATUS } from "@/lib/permissions";
import { ListingCard } from "@/components/ListingCard";
import { sellerTrustMap } from "@/lib/seller-trust";

const select = {
  id: true,
  title: true,
  game: true,
  cardType: true,
  condition: true,
  priceHkd: true,
  images: true,
  sellerId: true,
  seller: { select: { displayName: true } },
} as const;

function notThese(ids: Array<string | undefined>) {
  const clean = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  return clean.length ? { id: { notIn: clean } } : {};
}

function parseImages(json: string) {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

export async function MoreLikeThis({
  sellerId,
  sellerName,
  excludeListingId,
  game,
  favoritedIds,
  viewerId,
}: {
  sellerId: string;
  sellerName: string;
  excludeListingId?: string;
  game: string;
  favoritedIds: Set<string>;
  viewerId?: string | null;
}) {
  const fromSellerSameGame = await prisma.listing.findMany({
    where: {
      sellerId,
      game,
      status: LISTING_STATUS.ACTIVE,
      seller: { status: { not: USER_STATUS.BLOCKED } },
      ...notThese([excludeListingId]),
    },
    select,
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  const have = new Set(fromSellerSameGame.map((item) => item.id));
  const needFromSeller = 8 - fromSellerSameGame.length;
  const fromSellerOther =
    needFromSeller > 0
      ? await prisma.listing.findMany({
          where: {
            sellerId,
            status: LISTING_STATUS.ACTIVE,
            seller: { status: { not: USER_STATUS.BLOCKED } },
            ...notThese([excludeListingId, ...have]),
          },
          select,
          orderBy: { createdAt: "desc" },
          take: needFromSeller,
        })
      : [];
  const combined = [...fromSellerSameGame, ...fromSellerOther];
  have.clear();
  combined.forEach((item) => have.add(item.id));
  const needFill = 8 - combined.length;
  const fillers =
    needFill > 0
      ? await prisma.listing.findMany({
          where: {
            game,
            sellerId: { not: sellerId },
            status: LISTING_STATUS.ACTIVE,
            seller: { status: { not: USER_STATUS.BLOCKED } },
            ...notThese([excludeListingId, ...have]),
          },
          select,
          orderBy: { createdAt: "desc" },
          take: needFill,
        })
      : [];
  const rows = [...combined, ...fillers];
  if (rows.length === 0) return null;
  const trust = await sellerTrustMap(rows.map((item) => item.sellerId));

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[var(--accent)]">更多推介</p>
          <h2 className="text-xl font-black tracking-tight md:text-2xl">相關推薦</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">{sellerName} 的其他商品</p>
        </div>
        <Link href={`/users/${sellerId}`} className="shrink-0 text-sm font-bold text-[var(--accent)]">
          瀏覽整間商店
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {rows.map((item) => (
          <ListingCard
            key={item.id}
            id={item.id}
            title={item.title}
            game={item.game}
            cardType={item.cardType}
            condition={item.condition}
            priceHkd={item.priceHkd}
            images={parseImages(item.images)}
            sellerName={item.seller.displayName}
            sellerTrust={trust.get(item.sellerId)}
            showFavorite={viewerId !== item.sellerId}
            favorited={favoritedIds.has(item.id)}
          />
        ))}
      </div>
    </section>
  );
}

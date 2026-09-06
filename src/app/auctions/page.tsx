import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { isValidCardType } from "@/lib/constants";
import { USER_STATUS } from "@/lib/permissions";
import { buySectionLabel } from "@/lib/buy";
import { currentBid, auctionIsLive } from "@/lib/auction";
import { ListingCard } from "@/components/ListingCard";
import { SearchBar } from "@/components/SearchBar";
import { auth } from "@/lib/auth";
import { viewerWatchState } from "@/lib/watch";
import { auctionSearchWhere, scoreCatalogItem, searchHint } from "@/lib/search";
import { sellerTrustMap } from "@/lib/seller-trust";
import { auctionOrderBy, parseCatalogSort } from "@/lib/catalog-sort";

export const dynamic = "force-dynamic";

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; game?: string; type?: string; sort?: string }>;
}) {
  const { q = "", game = "", type = "", sort: sortRaw = "" } = await searchParams;
  const cardType = isValidCardType(type) ? type : "";
  const section = buySectionLabel(cardType);
  const sort = parseCatalogSort(game ? sortRaw : q.trim() ? "newest" : "ending");
  const [session, auctions] = await Promise.all([
    auth(),
    prisma.auction.findMany({
      where: {
        seller: { status: { not: USER_STATUS.BLOCKED } },
        status: { not: "CANCELLED" },
        ...auctionSearchWhere(q, { game, cardType }),
      },
      include: {
        seller: { select: { displayName: true } },
        bids: { orderBy: { amountHkd: "desc" }, take: 1 },
      },
      orderBy: auctionOrderBy(sort),
      take: q.trim() ? 80 : 48,
    }),
  ]);
  const ranked = q.trim()
    ? [...auctions].sort(
        (a, b) =>
          scoreCatalogItem({ ...b, sellerName: b.seller.displayName }, q) -
          scoreCatalogItem({ ...a, sellerName: a.seller.displayName }, q),
      )
    : sort === "price"
      ? [...auctions].sort(
          (a, b) => currentBid(a.startingBidHkd, a.bids[0]?.amountHkd) - currentBid(b.startingBidHkd, b.bids[0]?.amountHkd),
        )
      : auctions;
  const watch = await viewerWatchState(session?.user?.id);
  const trust = await sellerTrustMap(ranked.map((item) => item.sellerId));

  return (
    <div className="space-y-6">
      <section className="card p-4 md:p-6">
        <p className="text-sm font-bold text-[var(--accent)]">拍賣 · {section}</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
          {q.trim() ? `找到 ${ranked.length} 場拍賣` : cardType ? `${section}拍賣` : "精選拍賣"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)] md:text-base">
          {q.trim() ? searchHint(q) : "可搜尋卡名、賣家、鑑定等級，或依種類篩選。每場拍賣最長一星期。"}
        </p>
        <div className="mt-5">
          <Suspense>
            <SearchBar basePath="/auctions" />
          </Suspense>
        </div>
      </section>
      {ranked.length === 0 ? (
        <p className="py-16 text-center text-[var(--muted)]">
          {q.trim() ? `找不到「${q.trim()}」。請嘗試卡名、系列或賣家名稱。` : "此分類暫無拍賣。"}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {ranked.map((item, index) => {
            const live = auctionIsLive(item.endsAt, item.status);
            const bid = currentBid(item.startingBidHkd, item.bids[0]?.amountHkd);
            return (
              <ListingCard
                key={item.id}
                id={item.id}
                href={`/auctions/${item.id}`}
                title={item.title}
                game={item.game}
                cardType={item.cardType}
                condition={item.condition}
                priceHkd={bid}
                priceLabel={`目前 HK$${bid}`}
                badge={live ? undefined : "已結束"}
                endsAt={live ? item.endsAt : undefined}
                images={JSON.parse(item.images) as string[]}
                sellerName={item.seller.displayName}
                sellerTrust={trust.get(item.sellerId)}
                showFavorite={session?.user?.id !== item.sellerId}
                favoriteAuction
                favorited={watch.auctionIds.has(item.id)}
                priority={index < 8}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

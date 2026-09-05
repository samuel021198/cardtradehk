import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUS, TRADE_STATUS, isValidCardType } from "@/lib/constants";
import { USER_STATUS } from "@/lib/permissions";
import { buySectionLabel } from "@/lib/buy";
import { currentBid, auctionIsLive } from "@/lib/auction";
import { ListingCard } from "@/components/ListingCard";
import { SearchBar } from "@/components/SearchBar";
import { CatalogSection } from "@/components/CatalogSection";
import { auth } from "@/lib/auth";
import { viewerWatchState } from "@/lib/watch";
import { listingSearchWhere, scoreCatalogItem, searchHint } from "@/lib/search";
import { sellerTrustMap } from "@/lib/seller-trust";

export const dynamic = "force-dynamic";

function parseImages(json: string) {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; game?: string; type?: string }>;
}) {
  const { q = "", game = "", type = "" } = await searchParams;
  const cardType = isValidCardType(type) ? type : "";
  const section = buySectionLabel(cardType);
  const browsing = !q.trim() && !game && !cardType;
  const now = new Date();

  const listingCardSelect = {
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

  const [session, listings, endingSoon, soldTrades, soldListings] = await Promise.all([
    auth(),
    prisma.listing.findMany({
      where: {
        status: LISTING_STATUS.ACTIVE,
        seller: { status: { not: USER_STATUS.BLOCKED } },
        ...listingSearchWhere(q, { game, cardType }),
      },
      select: {
        id: true,
        title: true,
        game: true,
        cardType: true,
        condition: true,
        priceHkd: true,
        images: true,
        sellerId: true,
        description: true,
        seller: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: q.trim() ? 80 : browsing ? 12 : 24,
    }),
    browsing
      ? prisma.auction.findMany({
          where: {
            status: "LIVE",
            endsAt: { gt: now },
            seller: { status: { not: USER_STATUS.BLOCKED } },
          },
          include: {
            seller: { select: { displayName: true } },
            bids: { orderBy: { amountHkd: "desc" }, take: 1 },
          },
          orderBy: { endsAt: "asc" },
          take: 8,
        })
      : Promise.resolve([]),
    browsing
      ? prisma.trade.findMany({
          where: {
            listingId: { not: null },
            status: TRADE_STATUS.COMPLETED,
            listing: { seller: { status: { not: USER_STATUS.BLOCKED } } },
          },
          include: { listing: { select: listingCardSelect } },
          orderBy: [{ completedAt: "desc" }, { updatedAt: "desc" }],
          take: 8,
        })
      : Promise.resolve([]),
    browsing
      ? prisma.listing.findMany({
          where: {
            status: LISTING_STATUS.SOLD,
            seller: { status: { not: USER_STATUS.BLOCKED } },
          },
          select: listingCardSelect,
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : Promise.resolve([]),
  ]);

  const soldFromTrades = soldTrades
    .filter((row) => row.listing)
    .filter((row, index, list) => list.findIndex((item) => item.listing!.id === row.listing!.id) === index)
    .map((row) => ({
      key: row.id,
      amountHkd: row.amountHkd,
      listing: row.listing!,
    }));
  const sold =
    soldFromTrades.length > 0
      ? soldFromTrades
      : soldListings.map((item) => ({
          key: item.id,
          amountHkd: item.priceHkd,
          listing: item,
        }));

  const ranked = q.trim()
    ? [...listings].sort(
        (a, b) =>
          scoreCatalogItem({ ...b, sellerName: b.seller.displayName }, q) -
          scoreCatalogItem({ ...a, sellerName: a.seller.displayName }, q),
      )
    : listings;
  const watch = await viewerWatchState(session?.user?.id);
  const trust = await sellerTrustMap([
    ...ranked.map((item) => item.sellerId),
    ...endingSoon.map((item) => item.sellerId),
    ...sold.map((row) => row.listing.sellerId),
  ]);

  return (
    <div className="space-y-8">
      <section className="card p-4 md:p-6">
        <p className="text-sm font-bold text-[var(--accent)]">消費 · {section}</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
          {q.trim() ? `找到 ${ranked.length} 件商品` : cardType ? section : "香港卡牌市集"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)] md:text-base">
          {q.trim() ? searchHint(q) : "可依種類篩選，或搜尋卡名、賣家、鑑定等級與價格。"}
        </p>
        <div className="mt-5">
          <Suspense>
            <SearchBar />
          </Suspense>
        </div>
      </section>

      {browsing && endingSoon.length > 0 && (
        <CatalogSection kicker="拍賣" title="即將完結" hint="剩餘時間較短的進行中拍賣。" href="/auctions">
          {endingSoon.map((item, index) => {
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
                endsAt={live ? item.endsAt : undefined}
                badge={live ? undefined : "已結束"}
                images={parseImages(item.images)}
                sellerName={item.seller.displayName}
                sellerTrust={trust.get(item.sellerId)}
                showFavorite={session?.user?.id !== item.sellerId}
                favoriteAuction
                favorited={watch.auctionIds.has(item.id)}
                priority={index < 4}
              />
            );
          })}
        </CatalogSection>
      )}

      {ranked.length === 0 ? (
        <p className="py-16 text-center text-[var(--muted)]">
          {q.trim() ? `找不到「${q.trim()}」。請嘗試卡名、系列或賣家名稱。` : "此分類暫無商品。"}
        </p>
      ) : browsing ? (
        <CatalogSection kicker="放售" title="最新上架" hint="最近發佈、仍可購買的商品。">
          {ranked.map((item, index) => (
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
              showFavorite={session?.user?.id !== item.sellerId}
              favorited={watch.listingIds.has(item.id)}
              priority={index < 8}
            />
          ))}
        </CatalogSection>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {ranked.map((item, index) => (
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
              showFavorite={session?.user?.id !== item.sellerId}
              favorited={watch.listingIds.has(item.id)}
              priority={index < 8}
            />
          ))}
        </div>
      )}

      {browsing && sold.length > 0 && (
        <CatalogSection kicker="市場" title="已售參考" hint="近期成交價，供比較市況。">
          {sold.map((row) => {
            const item = row.listing;
            return (
              <ListingCard
                key={row.key}
                id={item.id}
                title={item.title}
                game={item.game}
                cardType={item.cardType}
                condition={item.condition}
                priceHkd={row.amountHkd}
                priceLabel={`已售 HK$${row.amountHkd}`}
                status="SOLD"
                images={parseImages(item.images)}
                sellerName={item.seller.displayName}
                sellerTrust={trust.get(item.sellerId)}
              />
            );
          })}
        </CatalogSection>
      )}
    </div>
  );
}

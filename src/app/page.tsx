import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUS, isValidCardType } from "@/lib/constants";
import { USER_STATUS } from "@/lib/permissions";
import { buySectionLabel } from "@/lib/buy";
import { currentBid, auctionIsLive } from "@/lib/auction";
import { ListingCard } from "@/components/ListingCard";
import { SearchBar } from "@/components/SearchBar";
import { CatalogSection } from "@/components/CatalogSection";
import { auth } from "@/lib/auth";
import { viewerWatchState } from "@/lib/watch";
import { auctionSearchWhere, listingSearchWhere, scoreCatalogItem, searchHint } from "@/lib/search";
import { sellerTrustMap } from "@/lib/seller-trust";
import { auctionOrderBy, catalogHref, listingOrderBy, parseCatalogSort } from "@/lib/catalog-sort";

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
  searchParams: Promise<{ q?: string; game?: string; type?: string; sort?: string; view?: string }>;
}) {
  const { q = "", game = "", type = "", sort: sortRaw = "", view = "" } = await searchParams;
  const cardType = isValidCardType(type) ? type : "";
  const section = buySectionLabel(cardType);
  const sort = parseCatalogSort(game ? sortRaw : "newest");
  const listingsOnly = view === "listings";
  const searching = Boolean(q.trim());
  const preview = !searching && !listingsOnly;
  const listingLimit = searching || listingsOnly ? 80 : 6;
  const now = new Date();

  const [session, listings, auctions] = await Promise.all([
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
      orderBy: listingOrderBy(sort),
      take: listingLimit,
    }),
    preview
      ? prisma.auction.findMany({
          where: {
            status: "LIVE",
            endsAt: { gt: now },
            seller: { status: { not: USER_STATUS.BLOCKED } },
            ...auctionSearchWhere("", { game, cardType }),
          },
          include: {
            seller: { select: { displayName: true } },
            bids: { orderBy: { amountHkd: "desc" }, take: 1 },
          },
          orderBy: auctionOrderBy(sort),
          take: 6,
        })
      : Promise.resolve([]),
  ]);

  const ranked = searching
    ? [...listings].sort(
        (a, b) =>
          scoreCatalogItem({ ...b, sellerName: b.seller.displayName }, q) -
          scoreCatalogItem({ ...a, sellerName: a.seller.displayName }, q),
      )
    : listings;

  const auctionRows =
    sort === "price"
      ? [...auctions].sort(
          (a, b) =>
            currentBid(a.startingBidHkd, a.bids[0]?.amountHkd) - currentBid(b.startingBidHkd, b.bids[0]?.amountHkd),
        )
      : auctions;

  const listingPreview = preview ? ranked.slice(0, 6) : ranked;
  const auctionPreview = auctionRows.slice(0, 6);

  const watch = await viewerWatchState(session?.user?.id);
  const trust = await sellerTrustMap([...listingPreview, ...auctionPreview].map((item) => item.sellerId));
  const filter = { q, game, type, sort };

  return (
    <div className="space-y-8">
      <section className="card p-4 md:p-6">
        <p className="text-sm font-bold text-[var(--accent)]">消費 · {section}</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
          {searching ? `找到 ${ranked.length} 件商品` : listingsOnly ? "最新上架" : cardType ? section : "香港卡牌市集"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)] md:text-base">
          {searching ? searchHint(q) : "可依種類篩選，或搜尋卡名、賣家、鑑定等級與價格。"}
        </p>
        <div className="mt-5">
          <Suspense>
            <SearchBar />
          </Suspense>
        </div>
      </section>

      {listingPreview.length === 0 && (searching || listingsOnly || auctionPreview.length === 0) ? (
        <p className="py-16 text-center text-[var(--muted)]">
          {searching ? `找不到「${q.trim()}」。請嘗試卡名、系列或賣家名稱。` : "此分類暫無商品。"}
        </p>
      ) : preview ? (
        <>
          {listingPreview.length > 0 && (
            <CatalogSection
              kicker="放售"
              title="最新上架"
              hint="最近發佈、仍可購買的商品。"
              moreHref={catalogHref("/", { ...filter, view: "listings" })}
            >
              {listingPreview.map((item, index) => (
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
                  priority={index < 6}
                />
              ))}
            </CatalogSection>
          )}
          {auctionPreview.length > 0 && (
            <CatalogSection
              kicker="拍賣"
              title="拍賣"
              hint="進行中的拍賣。"
              moreHref={catalogHref("/auctions", filter)}
            >
              {auctionPreview.map((item, index) => {
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
                    priority={index < 3}
                  />
                );
              })}
            </CatalogSection>
          )}
        </>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {listingPreview.map((item, index) => (
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
              priority={index < 6}
            />
          ))}
        </div>
      )}
    </div>
  );
}

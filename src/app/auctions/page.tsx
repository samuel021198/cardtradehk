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

export const dynamic = "force-dynamic";

export default async function AuctionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; game?: string; type?: string }>;
}) {
  const { q = "", game = "", type = "" } = await searchParams;
  const cardType = isValidCardType(type) ? type : "";
  const section = buySectionLabel(cardType);
  const [session, auctions] = await Promise.all([
    auth(),
    prisma.auction.findMany({
      where: {
        seller: { status: { not: USER_STATUS.BLOCKED } },
        status: { not: "CANCELLED" },
        ...(cardType ? { cardType } : {}),
        ...(game ? { game } : {}),
        ...(q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] } : {}),
      },
      include: {
        seller: { select: { displayName: true } },
        bids: { orderBy: { amountHkd: "desc" }, take: 1 },
      },
      orderBy: { endsAt: "asc" },
      take: 24,
    }),
  ]);
  const watch = await viewerWatchState(session?.user?.id);

  return (
    <div className="space-y-6">
      <section className="card p-4 md:p-6">
        <p className="text-sm font-bold text-[var(--accent)]">拍賣 · {section}</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">{cardType ? `${section}拍賣` : "精選拍賣"}</h1>
        <p className="mt-2 hidden max-w-2xl text-[var(--muted)] md:block">
          分類同消費一樣。每場最多一星期。平台唔經手付款，得標後私底下交收。
        </p>
        <div className="mt-5">
          <Suspense>
            <SearchBar basePath="/auctions" />
          </Suspense>
        </div>
      </section>
      {auctions.length === 0 ? (
        <p className="py-16 text-center text-[var(--muted)]">呢類暫時未有拍賣。</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {auctions.map((item, index) => {
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

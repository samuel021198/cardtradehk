import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListingCard } from "@/components/ListingCard";
import { currentBid, auctionIsLive } from "@/lib/auction";
import { UserAvatar } from "@/components/UserAvatar";
import { FollowShopButton } from "@/components/FollowShopButton";
import { sellerTrustMap } from "@/lib/seller-trust";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/favorites");

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      listing: { include: { seller: { select: { displayName: true } } } },
      auction: {
        include: {
          seller: { select: { displayName: true } },
          bids: { orderBy: { amountHkd: "desc" }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const listings = favorites.filter((f) => f.listing);
  const auctions = favorites.filter((f) => f.auction);
  const shops = await prisma.shopFollow.findMany({
    where: { userId: session.user.id },
    include: {
      shop: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          _count: { select: { listings: true, shopFollowers: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const trust = await sellerTrustMap([
    ...listings.map((f) => f.listing!.sellerId),
    ...auctions.map((f) => f.auction!.sellerId),
  ]);

  return (
    <div className="space-y-8">
      <section className="card p-6">
        <p className="text-sm font-bold text-[var(--accent)]">收藏</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">我的收藏</h1>
        <p className="mt-2 text-[var(--muted)]">於商品頁點選心形圖示即可收藏；於賣家頁點選「關注商店」即可追蹤商店。減價、被超價、售出及上新通知會顯示於「訊息 → 通知」。</p>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-black">收藏商店 · {shops.length}</h2>
        {shops.length === 0 ? (
          <p className="text-[var(--muted)]">尚未關注任何商店。請於賣家頁點選「關注商店」。</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {shops.map((row) => (
              <div key={row.id} className="card flex items-center gap-4 p-4">
                <Link href={`/users/${row.shop.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <UserAvatar name={row.shop.displayName} src={row.shop.avatarUrl} size="lg" />
                  <div className="min-w-0">
                    <div className="font-black">{row.shop.displayName}</div>
                    <p className="truncate text-sm text-[var(--muted)]">{row.shop.bio || "尚未填寫簡介"}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {row.shop._count.listings} 件商品 · {row.shop._count.shopFollowers} 人關注
                    </p>
                  </div>
                </Link>
                <FollowShopButton shopId={row.shop.id} initialFollowing />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-black">收藏商品 · {listings.length}</h2>
        {listings.length === 0 ? (
          <p className="text-[var(--muted)]">
            尚未收藏放售商品。請前往 <Link className="underline" href="/">消費</Link> 並點選心形圖示。
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {listings.map((f) => {
              const item = f.listing!;
              return (
                <ListingCard
                  key={f.id}
                  id={item.id}
                  title={item.title}
                  game={item.game}
                  cardType={item.cardType}
                  condition={item.condition}
                  priceHkd={item.priceHkd}
                  images={JSON.parse(item.images) as string[]}
                  sellerName={item.seller.displayName}
                  sellerTrust={trust.get(item.sellerId)}
                  status={item.status}
                  showFavorite
                  favorited
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-black">拍賣 · {auctions.length}</h2>
        {auctions.length === 0 ? (
          <p className="text-[var(--muted)]">
            尚未收藏拍賣。請前往 <Link className="underline" href="/auctions">拍賣</Link> 並點選心形圖示。
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {auctions.map((f) => {
              const item = f.auction!;
              const live = auctionIsLive(item.endsAt, item.status);
              const bid = currentBid(item.startingBidHkd, item.bids[0]?.amountHkd);
              return (
                <ListingCard
                  key={f.id}
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
                  showFavorite
                  favoriteAuction
                  favorited
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

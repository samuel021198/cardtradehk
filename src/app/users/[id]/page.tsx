import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { viewerWatchState } from "@/lib/watch";
import { FollowShopButton } from "@/components/FollowShopButton";
import { UserAvatar } from "@/components/UserAvatar";
import { ProfileTabs } from "@/components/ProfileTabs";
import { ProfileTile } from "@/components/ProfileTile";
import { ShopChatButton } from "@/components/ShopChatButton";
import { ReportUserButton } from "@/components/ReportUserButton";
import { auctionIsLive, currentBid } from "@/lib/auction";
import { LISTING_STATUS } from "@/lib/constants";
import { tierLabel } from "@/lib/tiers";

export const dynamic = "force-dynamic";

function parseImages(json: string) {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

export default async function UserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: rawTab } = await searchParams;
  const tab = ["featured", "selling", "auctions", "sold"].includes(rawTab ?? "") ? rawTab! : "featured";

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      listings: { orderBy: { createdAt: "desc" } },
      auctions: { include: { bids: { orderBy: { amountHkd: "desc" }, take: 1 } }, orderBy: { createdAt: "desc" } },
      reviewsReceived: { select: { rating: true } },
      _count: { select: { shopFollowers: true, reviewsReceived: true } },
    },
  });
  if (!user) notFound();

  const session = await auth();
  const watch = await viewerWatchState(session?.user?.id);
  const isOwn = session?.user?.id === user.id;
  const avg = user.reviewsReceived.length
    ? user.reviewsReceived.reduce((s, r) => s + r.rating, 0) / user.reviewsReceived.length
    : null;

  const selling = user.listings.filter((l) => l.status === LISTING_STATUS.ACTIVE || l.status === LISTING_STATUS.RESERVED);
  const sold = user.listings.filter((l) => l.status === LISTING_STATUS.SOLD);
  const auctions = user.auctions.filter((a) => a.status !== "CANCELLED");
  const liveAuctions = auctions.filter((a) => auctionIsLive(a.endsAt, a.status));
  const itemCount = selling.length + liveAuctions.length;

  const featured = [
    ...user.listings
      .filter((l) => l.pinnedAt && (isOwn || l.status !== LISTING_STATUS.HIDDEN))
      .map((l) => ({
        key: `l-${l.id}`,
        href: `/listings/${l.id}`,
        title: l.title,
        image: parseImages(l.images)[0],
        priceLabel: `HK$${l.priceHkd}`,
        pinned: true,
        listingId: l.id,
        pinnedAt: l.pinnedAt!,
      })),
    ...user.auctions
      .filter((a) => a.pinnedAt)
      .map((a) => ({
        key: `a-${a.id}`,
        href: `/auctions/${a.id}`,
        title: a.title,
        image: parseImages(a.images)[0],
        priceLabel: `目前 HK$${currentBid(a.startingBidHkd, a.bids[0]?.amountHkd)}`,
        pinned: true,
        auctionId: a.id,
        pinnedAt: a.pinnedAt!,
      })),
  ].sort((a, b) => b.pinnedAt.getTime() - a.pinnedAt.getTime());

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <section className="relative space-y-4">
        {!isOwn && (
          <div className="absolute right-0 top-0 flex gap-2">
            <ShopChatButton shopId={user.id} />
            <FollowShopButton shopId={user.id} initialFollowing={watch.shopIds.has(user.id)} iconOnly />
            <ReportUserButton targetUserId={user.id} targetName={user.displayName} />
          </div>
        )}
        {isOwn && (
          <Link className="absolute right-0 top-0 text-sm font-bold text-[var(--accent)]" href="/me">
            編輯
          </Link>
        )}
        <div className="flex items-center gap-6 pr-28">
          <UserAvatar name={user.displayName} src={user.avatarUrl} size="xl" />
          <div className="grid flex-1 grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-xl font-black">{itemCount}</div>
              <div className="text-xs text-[var(--muted)]">件商品</div>
            </div>
            <div>
              <div className="text-xl font-black">{user._count.shopFollowers}</div>
              <div className="text-xs text-[var(--muted)]">粉絲</div>
            </div>
            <Link href={`/users/${user.id}/reviews`} className="hover:text-[var(--accent)]">
              <div className="text-xl font-black">{avg ? avg.toFixed(1) : "—"}</div>
              <div className="text-xs text-[var(--muted)]">{user._count.reviewsReceived} 則評分</div>
            </Link>
          </div>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-black">{user.displayName}</h1>
            <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-black text-black">{tierLabel(user.membershipTier)}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm">{user.bio || "呢位卡友未寫簡介。"}</p>
        </div>
      </section>

      <ProfileTabs userId={user.id} tab={tab} />

      {tab === "featured" && (
        featured.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--muted)]">
            {isOwn ? "未有精選。去「售賣」或「拍賣」釘選最多 3 個帖。" : "賣家未釘選精選帖。"}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {featured.map(({ key, pinnedAt: _pinnedAt, ...item }) => (
              <ProfileTile key={key} {...item} canPin={isOwn} />
            ))}
          </div>
        )
      )}

      {tab === "selling" && (
        selling.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--muted)]">暫時未有售賣商品。</p>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {selling.map((item) => (
              <ProfileTile
                key={item.id}
                href={`/listings/${item.id}`}
                title={item.title}
                image={parseImages(item.images)[0]}
                priceLabel={`HK$${item.priceHkd}`}
                pinned={Boolean(item.pinnedAt)}
                canPin={isOwn}
                listingId={item.id}
              />
            ))}
          </div>
        )
      )}

      {tab === "auctions" && (
        auctions.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--muted)]">暫時未有拍賣。</p>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {auctions.map((item) => (
              <ProfileTile
                key={item.id}
                href={`/auctions/${item.id}`}
                title={item.title}
                image={parseImages(item.images)[0]}
                priceLabel={auctionIsLive(item.endsAt, item.status) ? `目前 HK$${currentBid(item.startingBidHkd, item.bids[0]?.amountHkd)}` : "已結束"}
                pinned={Boolean(item.pinnedAt)}
                canPin={isOwn}
                auctionId={item.id}
              />
            ))}
          </div>
        )
      )}

      {tab === "sold" && (
        sold.length === 0 ? (
          <p className="py-10 text-center text-sm text-[var(--muted)]">未有已售出商品。</p>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {sold.map((item) => (
              <ProfileTile
                key={item.id}
                href={`/listings/${item.id}`}
                title={item.title}
                image={parseImages(item.images)[0]}
                priceLabel={`HK$${item.priceHkd}`}
                pinned={Boolean(item.pinnedAt)}
                canPin={isOwn}
                listingId={item.id}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

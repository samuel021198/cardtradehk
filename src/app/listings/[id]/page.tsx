import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listingMeta } from "@/lib/constants";
import { ContactActions } from "@/components/ContactActions";
import { SellerListingActions } from "@/components/SellerListingActions";
import { FavoriteButton } from "@/components/FavoriteButton";
import { FollowShopButton } from "@/components/FollowShopButton";
import { OfferPanel, SellerOfferList } from "@/components/OfferPanel";
import { getCurrentUser, USER_STATUS } from "@/lib/permissions";
import { viewerWatchState } from "@/lib/watch";
import { UserAvatar } from "@/components/UserAvatar";
import { OFFER_STATUS, TRADE_STATUS } from "@/lib/constants";
import { CoverImage } from "@/components/CoverImage";

export const dynamic = "force-dynamic";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const me = session?.user?.id ? await getCurrentUser() : null;
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: {
      seller: {
        include: {
          reviewsReceived: true,
        },
      },
    },
  });
  if (!listing || listing.seller.status === USER_STATUS.BLOCKED) notFound();

  const images = JSON.parse(listing.images) as string[];
  const ratings = listing.seller.reviewsReceived;
  const avg = ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : null;
  const isOwner = session?.user?.id === listing.sellerId;
  const watch = await viewerWatchState(session?.user?.id);
  const myOffer = session?.user?.id
    ? await prisma.offer.findUnique({
        where: { listingId_buyerId: { listingId: listing.id, buyerId: session.user.id } },
      })
    : null;
  const pendingOffers = isOwner
    ? await prisma.offer.findMany({
        where: { listingId: listing.id, status: OFFER_STATUS.PENDING },
        orderBy: { updatedAt: "desc" },
      })
    : [];
  const openTrade = await prisma.trade.findFirst({
    where: { listingId: listing.id, status: TRADE_STATUS.RESERVED },
  });
  const statusText =
    listing.status === "SOLD" ? " · 已售" : listing.status === "RESERVED" ? " · 已保留" : listing.status === "HIDDEN" ? " · 隱藏" : "";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--chip)]">
          <CoverImage src={images[0]} alt={listing.title} className="max-h-[520px] w-full object-contain bg-black" priority />
        </div>
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {images.slice(1).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <CoverImage key={src} src={src} alt="" className="aspect-square rounded-xl object-cover" />
            ))}
          </div>
        )}
      </section>
      <aside className="card space-y-4 p-6">
        <div className="text-sm font-bold text-[var(--muted)]">
          {listingMeta(listing.game, listing.cardType, listing.condition)}
          {statusText}
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-black">{listing.title}</h1>
          {!isOwner && <FavoriteButton listingId={listing.id} initialFavorited={watch.listingIds.has(listing.id)} />}
        </div>
        <div className="text-3xl font-black text-[var(--accent)]">HK${listing.priceHkd}</div>
        <p className="whitespace-pre-wrap text-[var(--muted)]">{listing.description || "賣家未寫詳情。"}</p>
        <div className="space-y-2 rounded-2xl bg-[var(--chip)] p-4">
          <Link href={`/users/${listing.seller.id}`} className="flex items-center gap-3">
            <UserAvatar name={listing.seller.displayName} src={listing.seller.avatarUrl} />
            <div>
            <div className="text-xs text-[var(--muted)]">賣家</div>
            <div className="font-black">{listing.seller.displayName}</div>
            <div className="text-sm">
              {avg ? `${avg.toFixed(1)} / 5 · ${ratings.length} 則評價` : "未有評價"}
            </div>
            </div>
          </Link>
          {!isOwner && <FollowShopButton shopId={listing.seller.id} initialFollowing={watch.shopIds.has(listing.seller.id)} />}
        </div>
        {listing.status === "RESERVED" && (
          <div className="rounded-2xl bg-[var(--chip)] p-4 text-sm">
            <div className="font-black text-[var(--accent)]">已保留</div>
            <p className="mt-1 text-[var(--muted)]">呢件商品暫時保留緊，唔再接受新出價。</p>
            {openTrade && (isOwner || session?.user?.id === openTrade.buyerId) && (
              <Link className="btn-primary mt-3 w-full" href="/trades">
                去交易中跟進
              </Link>
            )}
          </div>
        )}
        {isOwner ? (
          <>
            <SellerListingActions listingId={listing.id} status={listing.status} />
            {listing.status === "ACTIVE" && session?.user?.id && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">收到嘅出價</div>
                <SellerOfferList meId={session.user.id} listPrice={listing.priceHkd} offers={pendingOffers} />
              </div>
            )}
          </>
        ) : listing.status === "ACTIVE" ? (
          <>
            {me ? (
              <OfferPanel listingId={listing.id} listPrice={listing.priceHkd} meId={me.id} offer={myOffer} />
            ) : (
              <Link className="btn-primary w-full" href={`/login?callbackUrl=/listings/${listing.id}`}>
                登入後出價
              </Link>
            )}
            {me?.canChat === false ? (
              <p className="text-sm text-[var(--muted)]">你嘅戶口暫時唔可以用站內傾偈。</p>
            ) : (
              <ContactActions
                listingId={listing.id}
                listingTitle={listing.title}
                sellerWhatsapp={listing.seller.whatsapp}
              />
            )}
          </>
        ) : (
          !isOwner && <p className="text-sm text-[var(--muted)]">呢件商品而家唔接受新出價。</p>
        )}
      </aside>
    </div>
  );
}

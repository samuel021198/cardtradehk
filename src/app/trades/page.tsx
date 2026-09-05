import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OFFER_STATUS, TRADE_STATUS } from "@/lib/constants";
import { TradeActions } from "@/components/TradeActions";
import { ReviewForm } from "@/components/ReviewForm";
import { OfferPanel } from "@/components/OfferPanel";
import { settleEndedAuction } from "@/lib/auction-settle";

export const dynamic = "force-dynamic";

function parseImages(json: string) {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

export default async function TradesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/trades");
  const meId = session.user.id;

  const endedLive = await prisma.auction.findMany({
    where: {
      status: "LIVE",
      endsAt: { lte: new Date() },
      OR: [{ sellerId: meId }, { bids: { some: { bidderId: meId } } }],
    },
    select: { id: true },
  });
  for (const row of endedLive) await settleEndedAuction(row.id);

  const [trades, offers] = await Promise.all([
    prisma.trade.findMany({
      where: { OR: [{ buyerId: meId }, { sellerId: meId }] },
      include: {
        listing: true,
        auction: true,
        buyer: { select: { id: true, displayName: true } },
        seller: { select: { id: true, displayName: true } },
        offer: true,
        reviews: { select: { fromUserId: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.offer.findMany({
      where: {
        OR: [{ buyerId: meId }, { sellerId: meId }],
        status: OFFER_STATUS.PENDING,
      },
      include: {
        listing: { select: { id: true, title: true, priceHkd: true } },
        buyer: { select: { displayName: true } },
        seller: { select: { displayName: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const active = trades.filter((t) => t.status === TRADE_STATUS.RESERVED);
  const done = trades.filter((t) => t.status === TRADE_STATUS.COMPLETED);
  const maybeNeed = done.filter((t) => !t.reviews.some((r) => r.fromUserId === meId));
  const pendingConvoIds = maybeNeed.map((t) => t.conversationId).filter((id): id is string => Boolean(id));
  const oldReviewConvos = new Set(
    pendingConvoIds.length === 0
      ? []
      : (
          await prisma.review.findMany({
            where: { fromUserId: meId, deal: { conversationId: { in: pendingConvoIds } } },
            select: { deal: { select: { conversationId: true } } },
          })
        )
          .map((r) => r.deal?.conversationId)
          .filter((id): id is string => Boolean(id)),
  );
  const needReview = maybeNeed.filter((t) => !t.conversationId || !oldReviewConvos.has(t.conversationId));

  return (
    <div className="space-y-8">
      <section className="card p-6">
        <p className="text-sm font-bold text-[var(--accent)]">買賣跟進</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">交易中</h1>
        <p className="mt-2 max-w-2xl text-[var(--muted)]">
          保留之後：① 賣家確認發貨 ② 買家確認收貨 ③ 交易完成，雙方喺呢頁互評。拍賣得標者要 48 小時內確認跟進。
        </p>
      </section>

      {needReview.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-black text-[var(--accent)]">未評分 · {needReview.length}</h2>
          <p className="text-sm text-[var(--muted)]">交易已完成。喺呢度比星同寫評，對方帳戶會見到。</p>
          {needReview.map((trade) => {
            const other = trade.sellerId === meId ? trade.buyer : trade.seller;
            const title = trade.listing?.title ?? trade.auction?.title ?? "交易";
            return (
              <article key={trade.id} id={`review-${trade.id}`} className="card space-y-3 p-4">
                <div>
                  <div className="font-black">{title}</div>
                  <p className="text-sm text-[var(--muted)]">
                    HK${trade.amountHkd} · 評價 {other.displayName}
                  </p>
                </div>
                <ReviewForm tradeId={trade.id} otherName={other.displayName} />
              </article>
            );
          })}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-xl font-black">進行中 · {active.length}</h2>
        {active.length === 0 ? (
          <p className="text-[var(--muted)]">而家未有進行中嘅交易。</p>
        ) : (
          <div className="space-y-3">
            {active.map((trade) => {
              const isSeller = trade.sellerId === meId;
              const other = isSeller ? trade.buyer : trade.seller;
              const item = trade.listing ?? trade.auction;
              const href = trade.listingId ? `/listings/${trade.listingId}` : `/auctions/${trade.auctionId}`;
              const title = item?.title ?? "交易";
              const cover = item ? parseImages(item.images)[0] : "";
              const sourceLabel =
                trade.source === "OFFER" ? "由出價確認" : trade.source === "AUCTION" ? "拍賣得標" : "人手保留";
              return (
                <article key={trade.id} className="card grid gap-4 p-4 md:grid-cols-[96px_1fr_240px]">
                  <Link href={href} className="overflow-hidden rounded-xl bg-[var(--chip)]">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" className="h-24 w-full object-cover" />
                    ) : (
                      <div className="grid h-24 place-items-center text-xs font-bold">{title}</div>
                    )}
                  </Link>
                  <div>
                    <Link className="font-black hover:text-[var(--accent)]" href={href}>
                      {title}
                    </Link>
                    <div className="mt-1 text-lg font-black text-[var(--accent)]">成交 HK${trade.amountHkd}</div>
                    <p className="text-sm text-[var(--muted)]">
                      {isSeller ? "買家" : "賣家"} {other.displayName} · {sourceLabel}
                    </p>
                    {trade.conversationId && (
                      <Link className="mt-2 inline-block text-sm underline" href={`/messages/${trade.conversationId}`}>
                        去聊天
                      </Link>
                    )}
                  </div>
                  <TradeActions
                    tradeId={trade.id}
                    isSeller={isSeller}
                    isBuyer={!isSeller}
                    sellerShipped={Boolean(trade.sellerShippedAt)}
                    buyerReceived={Boolean(trade.buyerReceivedAt)}
                    source={trade.source}
                    winnerAcked={Boolean(trade.winnerAckAt)}
                    respondBy={trade.respondBy?.toISOString() ?? null}
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-black">議價中 · {offers.length}</h2>
        {offers.length === 0 ? (
          <p className="text-[var(--muted)]">未有待回覆出價。</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {offers.map((offer) => (
              <div key={offer.id} className="card space-y-2 p-4">
                <Link className="font-black hover:text-[var(--accent)]" href={`/listings/${offer.listing.id}`}>
                  {offer.listing.title}
                </Link>
                <p className="text-sm text-[var(--muted)]">
                  {offer.buyerId === meId ? `賣家 ${offer.seller.displayName}` : `買家 ${offer.buyer.displayName}`}
                  · 標價 HK${offer.listing.priceHkd}
                </p>
                <OfferPanel listingId={offer.listing.id} listPrice={offer.listing.priceHkd} meId={meId} offer={offer} />
              </div>
            ))}
          </div>
        )}
      </section>

      {done.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-black">已完成 · {done.length}</h2>
          <div className="space-y-2">
            {done.map((trade) => {
              const other = trade.sellerId === meId ? trade.buyer : trade.seller;
              const reviewed =
                trade.reviews.some((r) => r.fromUserId === meId) ||
                Boolean(trade.conversationId && oldReviewConvos.has(trade.conversationId));
              return (
                <article key={trade.id} className="card space-y-3 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <Link
                        className="font-black hover:text-[var(--accent)]"
                        href={trade.listingId ? `/listings/${trade.listingId}` : `/auctions/${trade.auctionId}`}
                      >
                        {trade.listing?.title ?? trade.auction?.title}
                      </Link>
                      <div className="text-sm text-[var(--muted)]">
                        HK${trade.amountHkd} · {other.displayName}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-emerald-500">{reviewed ? "已評分" : "待評分"}</div>
                  </div>
                  {reviewed && (
                    <Link className="text-sm underline" href={`/users/${other.id}/reviews`}>
                      睇 {other.displayName} 嘅評分
                    </Link>
                  )}
                  {!reviewed && (
                    <a className="text-sm underline" href={`#review-${trade.id}`}>
                      去上面寫評分
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

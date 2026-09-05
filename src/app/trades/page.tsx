import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GAMES, OFFER_STATUS, TRADE_STATUS } from "@/lib/constants";
import { TradeActions } from "@/components/TradeActions";
import { ReviewForm } from "@/components/ReviewForm";
import { OfferPanel } from "@/components/OfferPanel";
import { TradeSearch } from "@/components/TradeSearch";
import { settleEndedAuction } from "@/lib/auction-settle";

export const dynamic = "force-dynamic";

function parseImages(json: string) {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

const TABS = [
  { id: "todo", label: "要處理" },
  { id: "active", label: "進行中" },
  { id: "offers", label: "議價" },
  { id: "done", label: "已完成" },
] as const;

function chip(href: string, label: string, on: boolean, key: string) {
  return (
    <Link
      key={key}
      href={href}
      className={`rounded-full px-3 py-1.5 text-sm font-bold ${on ? "bg-[var(--accent)] text-black" : "bg-[var(--chip)]"}`}
    >
      {label}
    </Link>
  );
}

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; role?: string; source?: string; game?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/trades");
  const meId = session.user.id;
  const { tab = "todo", role = "", source = "", game = "", q = "" } = await searchParams;

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
        listing: { select: { id: true, title: true, priceHkd: true, game: true } },
        buyer: { select: { displayName: true } },
        seller: { select: { displayName: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const keyword = q.trim().toLowerCase();
  const byRole = trades.filter((t) => {
    if (role === "buy") return t.buyerId === meId;
    if (role === "sell") return t.sellerId === meId;
    return true;
  });
  const bySource = byRole.filter((t) => {
    if (source === "auction") return t.source === "AUCTION" || Boolean(t.auctionId);
    if (source === "listing") return t.source !== "AUCTION" && !t.auctionId;
    return true;
  });
  const filtered = bySource.filter((t) => {
    const item = t.listing ?? t.auction;
    if (game && item?.game !== game) return false;
    if (!keyword) return true;
    const other = t.sellerId === meId ? t.buyer.displayName : t.seller.displayName;
    const title = item?.title ?? "";
    return title.toLowerCase().includes(keyword) || other.toLowerCase().includes(keyword);
  });

  const active = filtered.filter((t) => t.status === TRADE_STATUS.RESERVED);
  const done = filtered.filter((t) => t.status === TRADE_STATUS.COMPLETED);
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
  const myAction = active.filter((t) => {
    if (t.sellerId === meId) return !t.sellerShippedAt;
    return Boolean(t.sellerShippedAt) && !t.buyerReceivedAt;
  });
  const visibleOffers = source === "auction"
    ? []
    : offers.filter((o) => {
        if (role === "buy" && o.buyerId !== meId) return false;
        if (role === "sell" && o.sellerId !== meId) return false;
        if (game && o.listing.game !== game) return false;
        if (keyword && !o.listing.title.toLowerCase().includes(keyword)) return false;
        return true;
      });

  const qs = (next: Record<string, string>) => {
    const p = new URLSearchParams({ tab, role, source, game, q, ...next });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    const s = p.toString();
    return s ? `/trades?${s}` : "/trades";
  };

  return (
    <div className="space-y-6">
      <section className="card space-y-4 p-4 md:p-6">
        <div>
          <p className="text-sm font-bold text-[var(--accent)]">買賣跟進</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">交易中</h1>
          <p className="mt-2 max-w-2xl text-[var(--muted)]">
            賣家發貨 → 買家收貨 → 互評。用下面篩選睇你要處理嘅單。
          </p>
        </div>
        <div className="chip-row md:flex-wrap md:overflow-visible">
          {TABS.map((item) =>
            chip(
              qs({ tab: item.id }),
              `${item.label} · ${
                item.id === "todo"
                  ? needReview.length + myAction.length + visibleOffers.filter((o) => o.proposedById !== meId).length
                  : item.id === "active"
                    ? active.length
                    : item.id === "offers"
                      ? visibleOffers.length
                      : done.length
              }`,
              tab === item.id,
              `tab-${item.id}`,
            ),
          )}
        </div>
        <div className="chip-row md:flex-wrap md:overflow-visible">
          {chip(qs({ role: "buy" }), "購買中", role === "buy", "role-buy")}
          {chip(qs({ role: "sell" }), "售賣中", role === "sell", "role-sell")}
          {chip(qs({ role: "" }), "全部", role === "", "role-all")}
        </div>
        <div className="chip-row md:flex-wrap md:overflow-visible">
          {chip(qs({ game: "" }), "全部種類", game === "", "game-all")}
          {GAMES.map((item) => chip(qs({ game: item.value }), item.label, game === item.value, `game-${item.value}`))}
        </div>
        <div className="chip-row md:flex-wrap md:overflow-visible">
          {chip(qs({ source: "" }), "放售＋拍賣", source === "", "src-all")}
          {chip(qs({ source: "listing" }), "放售", source === "listing", "src-listing")}
          {chip(qs({ source: "auction" }), "拍賣", source === "auction", "src-auction")}
        </div>
        <Suspense>
          <TradeSearch />
        </Suspense>
      </section>

      {(tab === "todo" || tab === "done") && needReview.length > 0 && (tab === "todo" || tab === "done") && (
        <section className="space-y-3">
          <h2 className="text-xl font-black text-[var(--accent)]">未評分 · {needReview.length}</h2>
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

      {tab === "todo" && myAction.length === 0 && needReview.length === 0 && visibleOffers.filter((o) => o.proposedById !== meId).length === 0 && (
        <p className="text-[var(--muted)]">而家冇等你處理嘅單。</p>
      )}

      {(tab === "todo" ? myAction : tab === "active" ? active : []).length > 0 && (tab === "todo" || tab === "active") && (
        <section className="space-y-3">
          <h2 className="text-xl font-black">{tab === "todo" ? "等你確認" : "進行中"} · {(tab === "todo" ? myAction : active).length}</h2>
          <div className="space-y-3">
            {(tab === "todo" ? myAction : active).map((trade) => {
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
                      <img src={cover} alt="" className="h-24 w-full object-cover" referrerPolicy="no-referrer" />
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
                        去訊息
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
        </section>
      )}

      {tab === "active" && active.length === 0 && <p className="text-[var(--muted)]">未有進行中交易。</p>}

      {(tab === "todo" || tab === "offers") && (
        <section className="space-y-3">
          {(tab === "offers" || visibleOffers.some((o) => o.proposedById !== meId)) && (
            <>
              <h2 className="text-xl font-black">議價 · {visibleOffers.length}</h2>
              {visibleOffers.length === 0 ? (
                <p className="text-[var(--muted)]">未有待回覆出價。</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {visibleOffers.map((offer) => (
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
            </>
          )}
        </section>
      )}

      {tab === "done" && (
        <section className="space-y-3">
          {done.length === 0 ? (
            <p className="text-[var(--muted)]">未有已完成交易。</p>
          ) : (
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
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

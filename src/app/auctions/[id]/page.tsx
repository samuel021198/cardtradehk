import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { listingMeta } from "@/lib/constants";
import { auctionIsLive, currentBid } from "@/lib/auction";
import { settleEndedAuction } from "@/lib/auction-settle";
import { auth } from "@/lib/auth";
import { AuctionBidBox } from "@/components/AuctionBidBox";
import { AuctionCountdown } from "@/components/AuctionCountdown";
import { AuctionWinnerPanel } from "@/components/AuctionWinnerPanel";
import { FavoriteButton } from "@/components/FavoriteButton";
import { FollowShopButton } from "@/components/FollowShopButton";
import { viewerWatchState } from "@/lib/watch";
import { whatsappLink } from "@/lib/phone";
import { UserAvatar } from "@/components/UserAvatar";
import { TRADE_STATUS } from "@/lib/constants";
import { CoverImage } from "@/components/CoverImage";

export const dynamic = "force-dynamic";

export default async function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const auction = await prisma.auction.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, displayName: true, whatsapp: true, avatarUrl: true } },
      bids: {
        include: { bidder: { select: { id: true, displayName: true, whatsapp: true, avatarUrl: true } } },
        orderBy: { amountHkd: "desc" },
      },
      trades: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!auction) notFound();

  const live = auctionIsLive(auction.endsAt, auction.status);
  if (!live) await settleEndedAuction(id);

  const latest = await prisma.auction.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, displayName: true, whatsapp: true, avatarUrl: true } },
      bids: {
        include: { bidder: { select: { id: true, displayName: true, whatsapp: true, avatarUrl: true } } },
        orderBy: { amountHkd: "desc" },
      },
      trades: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!latest) notFound();

  const top = latest.bids[0];
  const runner = latest.bids.find((b) => b.bidderId !== top?.bidderId);
  const bid = currentBid(latest.startingBidHkd, top?.amountHkd);
  const minNext = latest.bids.length === 0 ? bid : bid + latest.minIncrementHkd;
  const images = JSON.parse(latest.images) as string[];
  const isSeller = session?.user?.id === latest.sellerId;
  const isWinner = Boolean(top && session?.user?.id === top.bidderId);
  const watch = await viewerWatchState(session?.user?.id);
  const trade = latest.trades[0];
  const stillLive = auctionIsLive(latest.endsAt, latest.status);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--chip)]">
          <CoverImage src={images[0]} alt={latest.title} className="max-h-[520px] w-full object-contain bg-black" priority />
        </div>
      </section>
      <aside className="card space-y-4 p-6">
        <div className="text-sm font-bold text-[var(--muted)]">{listingMeta(latest.game, latest.cardType, latest.condition)}</div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-3xl font-black">{latest.title}</h1>
          {!isSeller && <FavoriteButton auctionId={latest.id} initialFavorited={watch.auctionIds.has(latest.id)} />}
        </div>
        <div className="text-3xl font-black text-[var(--accent)]">目前 HK${bid}</div>
        <div className="space-y-1">
          <p className="text-sm text-[var(--muted)]">
            起拍 HK${latest.startingBidHkd} · 每次最少加 HK${latest.minIncrementHkd}
          </p>
          <p className="text-2xl font-black tracking-wide">
            {stillLive ? <AuctionCountdown endsAt={latest.endsAt} prefix="剩餘 " /> : "已結束"}
          </p>
          <p className="text-xs text-[var(--muted)]">顯示格式：日：小時：分鐘：秒</p>
          {latest.extensionCount > 0 && (
            <p className="text-xs font-semibold text-[var(--accent)]">已因尾段出價自動延長 {latest.extensionCount} 次</p>
          )}
        </div>
        <p className="text-sm text-[var(--muted)]">
          完結前 10 分鐘內有人出價，結束時間會自動加 5 分鐘，唔設上限。例如原定 22:05:59，喺 22:01–22:05:59 出價就去到 22:10:59。
        </p>
        <p className="whitespace-pre-wrap text-[var(--muted)]">{latest.description || "賣家未寫詳情。"}</p>
        <div className="space-y-2 rounded-2xl bg-[var(--chip)] p-4">
          <Link href={`/users/${latest.seller.id}`} className="flex items-center gap-3">
            <UserAvatar name={latest.seller.displayName} src={latest.seller.avatarUrl} />
            <div>
              <div className="text-xs text-[var(--muted)]">賣家</div>
              <div className="font-black">{latest.seller.displayName}</div>
            </div>
          </Link>
          {!isSeller && <FollowShopButton shopId={latest.seller.id} initialFollowing={watch.shopIds.has(latest.seller.id)} />}
        </div>
        {stillLive ? (
          isSeller ? (
            <p className="text-sm text-[var(--muted)]">呢場係你開嘅拍賣。等其他人出價。</p>
          ) : (
            <AuctionBidBox auctionId={latest.id} minNext={minNext} live />
          )
        ) : top ? (
          (isSeller || isWinner) && (
            <AuctionWinnerPanel
              auctionId={latest.id}
              title={latest.title}
              amountHkd={top.amountHkd}
              winner={top.bidder}
              runnerUp={runner?.bidder}
              tradeHref={trade ? "/trades" : null}
              winnerAcked={Boolean(trade?.winnerAckAt)}
              respondBy={trade?.respondBy?.toISOString() ?? null}
              abandoned={trade?.status === TRADE_STATUS.CANCELLED}
              isSeller={isSeller}
            />
          )
        ) : (
          <p className="text-sm text-[var(--muted)]">拍賣已完結，未有人出價。</p>
        )}
        {!stillLive && !isSeller && !isWinner && top && latest.seller.whatsapp && (
          <a className="btn-secondary w-full" href={whatsappLink(latest.seller.whatsapp, `你好，我睇緊「${latest.title}」`)} target="_blank" rel="noreferrer">
            WhatsApp 賣家
          </a>
        )}
        <div>
          <div className="mb-2 text-sm font-bold">出價紀錄</div>
          {latest.bids.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">未有人出價。</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {latest.bids.slice(0, 8).map((b) => (
                <li key={b.id}>
                  HK${b.amountHkd} · {b.bidder.displayName}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

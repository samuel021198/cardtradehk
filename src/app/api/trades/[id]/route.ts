import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUS, TRADE_STATUS } from "@/lib/constants";
import { NOTIFICATION_TYPE, notifyListingSold, notifyUser } from "@/lib/notify";
import { completeTrade } from "@/lib/trade";

type Params = { params: Promise<{ id: string }> };

function tradeTitle(trade: { listing: { title: string } | null; auction: { title: string } | null }) {
  return trade.listing?.title ?? trade.auction?.title ?? "交易";
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { id } = await params;
  const trade = await prisma.trade.findUnique({
    where: { id },
    include: { listing: true, auction: true },
  });
  if (!trade || (trade.buyerId !== session.user.id && trade.sellerId !== session.user.id)) {
    return NextResponse.json({ error: "搵唔到呢單交易" }, { status: 404 });
  }
  if (trade.status !== TRADE_STATUS.RESERVED) {
    return NextResponse.json({ error: "呢單交易已經完結" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");
  const isSeller = session.user.id === trade.sellerId;
  const isBuyer = session.user.id === trade.buyerId;
  const title = tradeTitle(trade);

  if (action === "ack") {
    if (!isBuyer) return NextResponse.json({ error: "只有得標者／買家可以確認" }, { status: 403 });
    await prisma.trade.update({ where: { id }, data: { winnerAckAt: trade.winnerAckAt ?? new Date() } });
    await notifyUser(trade.sellerId, {
      type: NOTIFICATION_TYPE.TRADE,
      title: "對方已確認得標",
      body: `「${title}」買家確認會跟進交收`,
      href: "/trades",
      listingId: trade.listingId,
      shopId: trade.sellerId,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "abandon") {
    const deadlinePassed = Boolean(trade.respondBy && trade.respondBy.getTime() <= Date.now());
    const sellerCanMark = isSeller && !trade.winnerAckAt && deadlinePassed;
    const buyerGivesUp = isBuyer && !trade.sellerShippedAt;
    if (!sellerCanMark && !buyerGivesUp) {
      return NextResponse.json({ error: "未到 48 小時，或者對方已確認，暫時唔可以當棄單" }, { status: 400 });
    }
    await prisma.trade.update({ where: { id }, data: { status: TRADE_STATUS.CANCELLED } });
    if (trade.listingId) {
      await prisma.listing.update({ where: { id: trade.listingId }, data: { status: LISTING_STATUS.ACTIVE } });
    }
    if (trade.source === "AUCTION") {
      await prisma.user.update({
        where: { id: trade.buyerId },
        data: { auctionAbandons: { increment: 1 } },
      });
    }
    const otherId = isSeller ? trade.buyerId : trade.sellerId;
    await notifyUser(otherId, {
      type: NOTIFICATION_TYPE.TRADE,
      title: "交易已當棄單",
      body: `「${title}」已取消。賣家可以聯絡次高出價者。`,
      href: trade.auctionId ? `/auctions/${trade.auctionId}` : `/listings/${trade.listingId}`,
      listingId: trade.listingId,
      shopId: trade.sellerId,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "cancel") {
    if (!isSeller) return NextResponse.json({ error: "只有賣家可以取消保留" }, { status: 403 });
    await prisma.trade.update({ where: { id }, data: { status: TRADE_STATUS.CANCELLED } });
    if (trade.listingId) {
      await prisma.listing.update({ where: { id: trade.listingId }, data: { status: LISTING_STATUS.ACTIVE } });
    }
    await notifyUser(trade.buyerId, {
      type: NOTIFICATION_TYPE.TRADE,
      title: "賣家取消保留",
      body: `「${title}」已取消保留`,
      href: trade.auctionId ? `/auctions/${trade.auctionId}` : `/listings/${trade.listingId}`,
      listingId: trade.listingId,
      shopId: trade.sellerId,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "ship") {
    if (!isSeller) return NextResponse.json({ error: "只有賣家可以確認發貨" }, { status: 403 });
    await prisma.trade.update({
      where: { id },
      data: { sellerShippedAt: trade.sellerShippedAt ?? new Date() },
    });
    await notifyUser(trade.buyerId, {
      type: NOTIFICATION_TYPE.TRADE,
      title: "賣家已發貨，請確認收貨",
      body: `「${title}」賣家已確認發貨。你收到貨之後，去「交易中」確認收貨。`,
      href: "/trades",
      listingId: trade.listingId,
      shopId: trade.sellerId,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "receive") {
    if (!isBuyer) return NextResponse.json({ error: "只有買家可以確認收貨" }, { status: 403 });
    if (!trade.sellerShippedAt) {
      return NextResponse.json({ error: "賣家未確認發貨，暫時唔可以確認收貨" }, { status: 400 });
    }
    const updated = await prisma.trade.update({
      where: { id },
      data: { buyerReceivedAt: trade.buyerReceivedAt ?? new Date() },
    });
    if (updated.sellerShippedAt && updated.buyerReceivedAt) {
      const done = await completeTrade(id);
      if (done.listing) await notifyListingSold(done.listing);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}

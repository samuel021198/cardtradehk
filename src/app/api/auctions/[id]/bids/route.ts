import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/permissions";
import { currentBid, nextEndsAtIfSniped } from "@/lib/auction";
import { settleEndedAuction } from "@/lib/auction-settle";
import { notifyOutbid } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "請先登入方可出價" }, { status: 401 });
  if (me.auctionAbandons >= 2) {
    return NextResponse.json({ error: "你有兩次或以上拍賣棄單，暫時無法再出價。請聯絡管理員。" }, { status: 403 });
  }

  const { id } = await params;
  const auction = await prisma.auction.findUnique({
    where: { id },
    include: { bids: { orderBy: { amountHkd: "desc" }, take: 1 } },
  });
  if (!auction) return NextResponse.json({ error: "找不到此拍賣" }, { status: 404 });
  if (auction.sellerId === me.id) return NextResponse.json({ error: "不可對自己開立的拍賣出價" }, { status: 400 });
  if (auction.status !== "LIVE" || auction.endsAt.getTime() <= Date.now()) {
    await settleEndedAuction(id);
    return NextResponse.json({ error: "此拍賣已結束" }, { status: 400 });
  }

  const amountHkd = Number((await req.json().catch(() => null))?.amountHkd);
  const top = currentBid(auction.startingBidHkd, auction.bids[0]?.amountHkd);
  const minNext = auction.bids.length === 0 ? top : top + auction.minIncrementHkd;
  if (!Number.isInteger(amountHkd) || amountHkd < minNext) {
    return NextResponse.json({ error: `出價至少 HK$${minNext}` }, { status: 400 });
  }

  const extendedEndsAt = nextEndsAtIfSniped(auction.endsAt);
  const previousBidderId = auction.bids[0]?.bidderId;
  const bid = await prisma.bid.create({
    data: { auctionId: id, bidderId: me.id, amountHkd },
  });
  if (extendedEndsAt) {
    await prisma.auction.update({
      where: { id },
      data: { endsAt: extendedEndsAt, extensionCount: { increment: 1 } },
    });
  }
  await notifyOutbid({
    previousBidderId: previousBidderId ?? "",
    newBidderId: me.id,
    auctionId: id,
    title: auction.title,
    amountHkd,
    sellerId: auction.sellerId,
  });

  return NextResponse.json({
    ...bid,
    endsAt: extendedEndsAt ?? auction.endsAt,
    extended: Boolean(extendedEndsAt),
  });
}

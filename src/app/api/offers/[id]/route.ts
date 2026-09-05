import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUS, OFFER_STATUS, TRADE_SOURCE } from "@/lib/constants";
import { NOTIFICATION_TYPE, notifyUser } from "@/lib/notify";
import { ensureListingConversation, reserveListing } from "@/lib/trade";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const { id } = await params;
  const offer = await prisma.offer.findUnique({
    where: { id },
    include: { listing: true },
  });
  if (!offer || (offer.buyerId !== session.user.id && offer.sellerId !== session.user.id)) {
    return NextResponse.json({ error: "找不到此出價" }, { status: 404 });
  }
  if (offer.status !== OFFER_STATUS.PENDING) {
    return NextResponse.json({ error: "此出價已經完結" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const action = String(body?.action ?? "");
  const isBuyer = session.user.id === offer.buyerId;
  const isSeller = session.user.id === offer.sellerId;
  const myTurn = offer.proposedById !== session.user.id;

  if (action === "cancel") {
    if (!isBuyer) return NextResponse.json({ error: "只有買家可以收回出價" }, { status: 403 });
    const updated = await prisma.offer.update({ where: { id }, data: { status: OFFER_STATUS.CANCELLED } });
    await notifyUser(offer.sellerId, {
      type: NOTIFICATION_TYPE.OFFER,
      title: "買家收回出價",
      body: `「${offer.listing.title}」的 HK$${offer.amountHkd} 出價已取消`,
      href: `/listings/${offer.listingId}`,
      listingId: offer.listingId,
      shopId: offer.sellerId,
    });
    return NextResponse.json(updated);
  }

  if (action === "decline") {
    if (!myTurn && !isSeller) return NextResponse.json({ error: "目前尚未輪到你回覆" }, { status: 403 });
    const updated = await prisma.offer.update({ where: { id }, data: { status: OFFER_STATUS.DECLINED } });
    const otherId = isSeller ? offer.buyerId : offer.sellerId;
    await notifyUser(otherId, {
      type: NOTIFICATION_TYPE.OFFER,
      title: "出價被拒絕",
      body: `「${offer.listing.title}」HK$${offer.amountHkd} 未達成`,
      href: `/listings/${offer.listingId}`,
      listingId: offer.listingId,
      shopId: offer.sellerId,
    });
    return NextResponse.json(updated);
  }

  if (action === "counter") {
    if (!myTurn) return NextResponse.json({ error: "等對方回覆先再議價" }, { status: 403 });
    if (offer.listing.status !== LISTING_STATUS.ACTIVE) {
      return NextResponse.json({ error: "商品目前不可再議價" }, { status: 400 });
    }
    const amountHkd = Number(body?.amountHkd);
    const note = String(body?.note ?? "").trim().slice(0, 200);
    if (!Number.isInteger(amountHkd) || amountHkd < 1) {
      return NextResponse.json({ error: "請輸入有效還價" }, { status: 400 });
    }
    const updated = await prisma.offer.update({
      where: { id },
      data: { amountHkd, note: note || null, proposedById: session.user.id },
    });
    const conversation = await ensureListingConversation(offer.listingId, offer.buyerId, offer.sellerId);
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: session.user.id,
        body: `還價 HK$${amountHkd}${note ? `：${note}` : ""}`,
      },
    });
    await notifyUser(isSeller ? offer.buyerId : offer.sellerId, {
      type: NOTIFICATION_TYPE.OFFER,
      title: "對方還價",
      body: `「${offer.listing.title}」還價 HK$${amountHkd}`,
      href: `/listings/${offer.listingId}`,
      listingId: offer.listingId,
      shopId: offer.sellerId,
    });
    return NextResponse.json(updated);
  }

  if (action === "accept") {
    if (!myTurn) return NextResponse.json({ error: "不可接受自己提出的價格，請等候對方回覆" }, { status: 403 });
    try {
      const trade = await reserveListing({
        listing: offer.listing,
        buyerId: offer.buyerId,
        amountHkd: offer.amountHkd,
        offerId: offer.id,
        source: TRADE_SOURCE.OFFER,
        actorId: session.user.id,
      });
      return NextResponse.json({ ok: true, tradeId: trade.id });
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "保留失敗" }, { status: 400 });
    }
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}

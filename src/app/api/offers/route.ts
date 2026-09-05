import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUS, OFFER_STATUS } from "@/lib/constants";
import { NOTIFICATION_TYPE, notifyUser } from "@/lib/notify";
import { ensureListingConversation } from "@/lib/trade";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const offers = await prisma.offer.findMany({
    where: { OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }] },
    include: {
      listing: { select: { id: true, title: true, priceHkd: true, status: true, images: true } },
      buyer: { select: { id: true, displayName: true } },
      seller: { select: { id: true, displayName: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json(offers);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const listingId = String(body?.listingId ?? "").trim();
  const amountHkd = Number(body?.amountHkd);
  const note = String(body?.note ?? "").trim().slice(0, 200);

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return NextResponse.json({ error: "找不到商品" }, { status: 404 });
  if (listing.sellerId === session.user.id) return NextResponse.json({ error: "不可對自己出價" }, { status: 400 });
  if (listing.status !== LISTING_STATUS.ACTIVE) return NextResponse.json({ error: "此商品目前不接受出價" }, { status: 400 });
  if (!Number.isInteger(amountHkd) || amountHkd < 1) return NextResponse.json({ error: "請輸入有效出價" }, { status: 400 });

  const existing = await prisma.offer.findUnique({
    where: { listingId_buyerId: { listingId, buyerId: session.user.id } },
  });
  if (existing?.status === OFFER_STATUS.ACCEPTED) {
    return NextResponse.json({ error: "此出價已經成交" }, { status: 400 });
  }
  if (existing?.status === OFFER_STATUS.PENDING) {
    return NextResponse.json({ error: "你已有一個待回覆出價，請待賣家回覆或取消後再提出" }, { status: 400 });
  }

  const offer = existing
    ? await prisma.offer.update({
        where: { id: existing.id },
        data: {
          amountHkd,
          note: note || null,
          status: OFFER_STATUS.PENDING,
          proposedById: session.user.id,
        },
      })
    : await prisma.offer.create({
        data: {
          listingId,
          buyerId: session.user.id,
          sellerId: listing.sellerId,
          amountHkd,
          note: note || null,
          status: OFFER_STATUS.PENDING,
          proposedById: session.user.id,
        },
      });

  const conversation = await ensureListingConversation(listingId, session.user.id, listing.sellerId);
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: session.user.id,
      body: `出價 HK$${amountHkd}${note ? `：${note}` : ""}`,
    },
  });
  await notifyUser(listing.sellerId, {
    type: NOTIFICATION_TYPE.OFFER,
    title: "有人出價",
    body: `「${listing.title}」收到 HK$${amountHkd} 出價`,
    href: `/listings/${listing.id}`,
    listingId: listing.id,
    shopId: listing.sellerId,
  });

  return NextResponse.json(offer);
}

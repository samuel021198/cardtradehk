import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { featureDenied, getCurrentUser } from "@/lib/permissions";
import { auctionIsLive } from "@/lib/auction";

function parseImages(json: string) {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }],
    },
    include: {
      listing: true,
      auction: { include: { bids: { orderBy: { amountHkd: "desc" }, take: 1 } } },
      buyer: { select: { id: true, displayName: true } },
      seller: { select: { id: true, displayName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      deal: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(
    conversations.map((c) => ({
      ...c,
      listing: c.listing ? { ...c.listing, images: parseImages(c.listing.images) } : null,
    })),
  );
}

async function seedAuctionMessages(
  conversationId: string,
  seller: { id: string; deliveryNote: string | null; paymentNote: string | null },
  amountHkd: number,
  title: string,
  auctionUrl: string,
) {
  const congratulations = `恭喜你以$${amountHkd}拍得「${auctionUrl}」`;
  const fulfillment = `交收方式：${seller.deliveryNote?.trim() || "（未設定，請於「帳戶」填寫預設交收方式）"}\n付款方法：${seller.paymentNote?.trim() || "（未設定，請於「帳戶」填寫預設付款方法）"}`;

  await prisma.message.createMany({
    data: [
      { conversationId, senderId: seller.id, body: congratulations },
      { conversationId, senderId: seller.id, body: fulfillment },
    ],
  });
  await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const denied = featureDenied(me, "chat");
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });

  const body = await req.json().catch(() => null);
  const auctionId = String(body?.auctionId ?? "").trim();

  if (auctionId) {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        seller: true,
        bids: { orderBy: { amountHkd: "desc" } },
      },
    });
    if (!auction) return NextResponse.json({ error: "找不到此拍賣" }, { status: 404 });
    const live = auctionIsLive(auction.endsAt, auction.status);
    if (live) return NextResponse.json({ error: "拍賣尚未完結，暫時無法開啟對話" }, { status: 400 });
    const winnerId = auction.bids[0]?.bidderId;
    const contactBidderId = String(body?.contactBidderId ?? "").trim() || winnerId;
    if (!winnerId) return NextResponse.json({ error: "此拍賣尚未有得標者" }, { status: 400 });
    const bid = auction.bids.find((b) => b.bidderId === contactBidderId) ?? auction.bids[0];
    if (session.user.id !== auction.sellerId && session.user.id !== contactBidderId) {
      return NextResponse.json({ error: "僅賣家或該出價者可以開啟此對話" }, { status: 403 });
    }
    if (session.user.id !== auction.sellerId && contactBidderId !== winnerId) {
      return NextResponse.json({ error: "只有得標者或賣家可以開對話" }, { status: 403 });
    }

    const existing = await prisma.conversation.findUnique({
      where: { auctionId_buyerId: { auctionId, buyerId: contactBidderId } },
    });
    if (existing) return NextResponse.json(existing);

    const conversation = await prisma.conversation.create({
      data: {
        auctionId,
        buyerId: contactBidderId,
        sellerId: auction.sellerId,
      },
    });

    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "http://localhost:3000";
    await seedAuctionMessages(
      conversation.id,
      auction.seller,
      bid.amountHkd,
      auction.title,
      `${origin}/auctions/${auction.id}`,
    );

    return NextResponse.json(conversation);
  }

  const shopId = String(body?.shopId ?? "").trim();
  if (shopId) {
    if (shopId === session.user.id) return NextResponse.json({ error: "不可與自己開啟對話" }, { status: 400 });
    const shop = await prisma.user.findUnique({ where: { id: shopId } });
    if (!shop) return NextResponse.json({ error: "找不到此帳戶" }, { status: 404 });
    const existing = await prisma.conversation.findFirst({
      where: { sellerId: shopId, buyerId: session.user.id, listingId: null, auctionId: null },
    });
    if (existing) return NextResponse.json(existing);
    const conversation = await prisma.conversation.create({
      data: { sellerId: shopId, buyerId: session.user.id },
    });
    return NextResponse.json(conversation);
  }

  const listingId = String(body?.listingId ?? "");
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return NextResponse.json({ error: "找不到商品" }, { status: 404 });
  if (listing.sellerId === session.user.id) {
    return NextResponse.json({ error: "不可與自己開啟對話" }, { status: 400 });
  }

  const conversation = await prisma.conversation.upsert({
    where: { listingId_buyerId: { listingId, buyerId: session.user.id } },
    update: {},
    create: {
      listingId,
      buyerId: session.user.id,
      sellerId: listing.sellerId,
    },
  });

  return NextResponse.json(conversation);
}

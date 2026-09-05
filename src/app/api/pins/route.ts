import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_PINS } from "@/lib/tiers";

async function pinCount(sellerId: string) {
  const [listings, auctions] = await Promise.all([
    prisma.listing.count({ where: { sellerId, pinnedAt: { not: null } } }),
    prisma.auction.count({ where: { sellerId, pinnedAt: { not: null } } }),
  ]);
  return listings + auctions;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const listingId = String(body?.listingId ?? "").trim();
  const auctionId = String(body?.auctionId ?? "").trim();
  if (!listingId && !auctionId) return NextResponse.json({ error: "缺少商品" }, { status: 400 });

  if (listingId) {
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing || listing.sellerId !== session.user.id) {
      return NextResponse.json({ error: "僅賣家可以釘選自己的商品" }, { status: 403 });
    }
    if (listing.pinnedAt) {
      await prisma.listing.update({ where: { id: listingId }, data: { pinnedAt: null } });
      return NextResponse.json({ pinned: false });
    }
    if ((await pinCount(session.user.id)) >= MAX_PINS) {
      return NextResponse.json({ error: `精選最多 ${MAX_PINS} 件商品` }, { status: 400 });
    }
    await prisma.listing.update({ where: { id: listingId }, data: { pinnedAt: new Date() } });
    return NextResponse.json({ pinned: true });
  }

  const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!auction || auction.sellerId !== session.user.id) {
    return NextResponse.json({ error: "僅賣家可以釘選自己的商品" }, { status: 403 });
  }
  if (auction.pinnedAt) {
    await prisma.auction.update({ where: { id: auctionId }, data: { pinnedAt: null } });
    return NextResponse.json({ pinned: false });
  }
  if ((await pinCount(session.user.id)) >= MAX_PINS) {
    return NextResponse.json({ error: `精選最多 ${MAX_PINS} 件商品` }, { status: 400 });
  }
  await prisma.auction.update({ where: { id: auctionId }, data: { pinnedAt: new Date() } });
  return NextResponse.json({ pinned: true });
}

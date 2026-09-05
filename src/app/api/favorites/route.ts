import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    include: {
      listing: { include: { seller: { select: { displayName: true } } } },
      auction: { include: { seller: { select: { displayName: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    listingIds: favorites.filter((f) => f.listingId).map((f) => f.listingId as string),
    auctionIds: favorites.filter((f) => f.auctionId).map((f) => f.auctionId as string),
    favorites,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const listingId = String(body?.listingId ?? "").trim();
  const auctionId = String(body?.auctionId ?? "").trim();
  if (Boolean(listingId) === Boolean(auctionId)) {
    return NextResponse.json({ error: "請選擇要收藏的商品" }, { status: 400 });
  }

  if (listingId) {
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) return NextResponse.json({ error: "找不到此商品" }, { status: 404 });
    if (listing.sellerId === session.user.id) {
      return NextResponse.json({ error: "不可收藏自己的商品" }, { status: 400 });
    }
    const favorite = await prisma.favorite.upsert({
      where: { userId_listingId: { userId: session.user.id, listingId } },
      update: {},
      create: { userId: session.user.id, listingId },
    });
    return NextResponse.json(favorite);
  }

  const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
  if (!auction) return NextResponse.json({ error: "找不到此拍賣" }, { status: 404 });
  if (auction.sellerId === session.user.id) {
    return NextResponse.json({ error: "不可收藏自己的拍賣" }, { status: 400 });
  }
  const favorite = await prisma.favorite.upsert({
    where: { userId_auctionId: { userId: session.user.id, auctionId } },
    update: {},
    create: { userId: session.user.id, auctionId },
  });
  return NextResponse.json(favorite);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const listingId = searchParams.get("listingId")?.trim() ?? "";
  const auctionId = searchParams.get("auctionId")?.trim() ?? "";

  if (listingId) {
    await prisma.favorite.deleteMany({ where: { userId: session.user.id, listingId } });
  } else if (auctionId) {
    await prisma.favorite.deleteMany({ where: { userId: session.user.id, auctionId } });
  } else {
    return NextResponse.json({ error: "缺少收藏對象" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

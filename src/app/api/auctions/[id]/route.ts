import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentBid } from "@/lib/auction";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const auction = await prisma.auction.findUnique({
    where: { id },
    include: {
      seller: { select: { id: true, displayName: true, whatsapp: true } },
      bids: {
        include: { bidder: { select: { id: true, displayName: true } } },
        orderBy: { amountHkd: "desc" },
      },
    },
  });
  if (!auction) return NextResponse.json({ error: "找不到此拍賣" }, { status: 404 });

  const top = auction.bids[0];
  const live = auction.status === "LIVE" && auction.endsAt.getTime() > Date.now();
  if (auction.status === "LIVE" && !live) {
    await prisma.auction.update({ where: { id }, data: { status: "ENDED" } });
  }

  return NextResponse.json({
    ...auction,
    images: JSON.parse(auction.images) as string[],
    currentBidHkd: currentBid(auction.startingBidHkd, top?.amountHkd),
    status: live ? "LIVE" : auction.status === "CANCELLED" ? "CANCELLED" : "ENDED",
  });
}

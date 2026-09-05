import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OFFER_STATUS } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || listing.sellerId !== session.user.id) {
    return NextResponse.json({ error: "找不到此商品" }, { status: 404 });
  }

  const [conversations, offers] = await Promise.all([
    prisma.conversation.findMany({
      where: { listingId: id },
      include: { buyer: { select: { id: true, displayName: true } } },
    }),
    prisma.offer.findMany({
      where: { listingId: id, status: OFFER_STATUS.PENDING },
      include: { buyer: { select: { id: true, displayName: true } } },
    }),
  ]);

  const map = new Map<string, { id: string; displayName: string; lastOfferHkd: number | null }>();
  for (const c of conversations) {
    map.set(c.buyer.id, { id: c.buyer.id, displayName: c.buyer.displayName, lastOfferHkd: null });
  }
  for (const o of offers) {
    map.set(o.buyer.id, { id: o.buyer.id, displayName: o.buyer.displayName, lastOfferHkd: o.amountHkd });
  }

  return NextResponse.json({ buyers: [...map.values()], listPriceHkd: listing.priceHkd });
}

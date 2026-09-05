import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TRADE_SOURCE } from "@/lib/constants";
import { reserveListing } from "@/lib/trade";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || listing.sellerId !== session.user.id) {
    return NextResponse.json({ error: "只有賣家可以人手保留" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const buyerId = String(body?.buyerId ?? "").trim();
  const amountHkd = Number(body?.amountHkd ?? listing.priceHkd);
  if (!buyerId) return NextResponse.json({ error: "請選擇買家" }, { status: 400 });
  if (!Number.isInteger(amountHkd) || amountHkd < 1) {
    return NextResponse.json({ error: "請輸入成交價" }, { status: 400 });
  }

  const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
  if (!buyer) return NextResponse.json({ error: "搵唔到買家" }, { status: 404 });

  try {
    const trade = await reserveListing({
      listing,
      buyerId,
      amountHkd,
      source: TRADE_SOURCE.MANUAL,
      actorId: session.user.id,
    });
    return NextResponse.json(trade);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "保留失敗" }, { status: 400 });
  }
}

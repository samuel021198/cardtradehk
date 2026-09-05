import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidCardType } from "@/lib/constants";
import { featureDenied, getCurrentUser, USER_STATUS } from "@/lib/permissions";
import { currentBid } from "@/lib/auction";
import { notifyShopNewAuction } from "@/lib/notify";
import { parseAuctionDraft, parseBatch } from "@/lib/listing-input";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const game = searchParams.get("game")?.trim() ?? "";
  const type = searchParams.get("type")?.trim() ?? "";
  const cardType = isValidCardType(type) ? type : "";

  const auctions = await prisma.auction.findMany({
    where: {
      seller: { status: { not: USER_STATUS.BLOCKED } },
      status: { not: "CANCELLED" },
      ...(cardType ? { cardType } : {}),
      ...(game ? { game } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] } : {}),
    },
    include: {
      seller: { select: { displayName: true } },
      bids: { orderBy: { amountHkd: "desc" }, take: 1 },
    },
    orderBy: { endsAt: "asc" },
  });

  return NextResponse.json(
    auctions.map((item) => ({
      ...item,
      images: JSON.parse(item.images) as string[],
      currentBidHkd: currentBid(item.startingBidHkd, item.bids[0]?.amountHkd),
    })),
  );
}

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const denied = featureDenied(me, "auction");
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });

  const body = await req.json().catch(() => null);
  const batch = parseBatch(body, parseAuctionDraft);
  if (!batch.ok) return NextResponse.json({ error: batch.error }, { status: 400 });

  const created = [];
  for (const draft of batch.drafts) {
    const startsAt = new Date();
    const endsAt = new Date(startsAt.getTime() + draft.durationHours * 60 * 60 * 1000);
    const auction = await prisma.auction.create({
      data: {
        title: draft.title,
        game: draft.game,
        cardType: draft.cardType,
        condition: draft.condition,
        description: draft.description,
        images: JSON.stringify(draft.images),
        startingBidHkd: draft.startingBidHkd,
        minIncrementHkd: draft.minIncrementHkd,
        startsAt,
        endsAt,
        sellerId: me.id,
      },
    });
    await notifyShopNewAuction(auction, me.displayName);
    created.push({ ...auction, images: draft.images });
  }

  if (created.length === 1) return NextResponse.json(created[0]);
  return NextResponse.json({ items: created, id: created[0].id });
}

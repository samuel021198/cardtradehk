import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUS, isValidCardType } from "@/lib/constants";
import { featureDenied, getCurrentUser, USER_STATUS } from "@/lib/permissions";
import { notifyShopNewListing } from "@/lib/notify";
import { parseBatch, parseListingDraft } from "@/lib/listing-input";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const game = searchParams.get("game")?.trim() ?? "";
  const type = searchParams.get("type")?.trim() ?? "";
  const cardType = isValidCardType(type) ? type : "";

  const listings = await prisma.listing.findMany({
    where: {
      status: LISTING_STATUS.ACTIVE,
      seller: { status: { not: USER_STATUS.BLOCKED } },
      ...(cardType ? { cardType } : {}),
      ...(game ? { game } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
    },
    include: {
      seller: { select: { id: true, displayName: true, whatsapp: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    listings.map((item) => ({
      ...item,
      images: JSON.parse(item.images) as string[],
    })),
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const denied = featureDenied(me, "post");
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });

  const body = await req.json().catch(() => null);
  const batch = parseBatch(body, parseListingDraft);
  if (!batch.ok) return NextResponse.json({ error: batch.error }, { status: 400 });

  const created = [];
  for (const draft of batch.drafts) {
    const listing = await prisma.listing.create({
      data: {
        title: draft.title,
        game: draft.game,
        cardType: draft.cardType,
        condition: draft.condition,
        description: draft.description,
        priceHkd: draft.priceHkd,
        images: JSON.stringify(draft.images),
        sellerId: session.user.id,
      },
    });
    await notifyShopNewListing(listing, me.displayName);
    created.push({ ...listing, images: JSON.parse(listing.images) as string[] });
  }

  if (created.length === 1) return NextResponse.json(created[0]);
  return NextResponse.json({ items: created, id: created[0].id });
}

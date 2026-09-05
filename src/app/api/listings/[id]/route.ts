import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GAMES, LISTING_STATUS, isValidCardType, isValidListingCondition } from "@/lib/constants";
import { featureDenied, getCurrentUser } from "@/lib/permissions";
import { notifyListingPriceDrop, notifyListingSold } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const denied = featureDenied(me, "post");
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });

  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || listing.sellerId !== session.user.id) {
    return NextResponse.json({ error: "找不到呢個帖，或者你無權限" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const data: {
    title?: string;
    game?: string;
    cardType?: string;
    condition?: string;
    description?: string;
    priceHkd?: number;
    images?: string;
    status?: string;
  } = {};

  if (body?.title != null) {
    const title = String(body.title).trim();
    if (title.length < 2) return NextResponse.json({ error: "標題太短" }, { status: 400 });
    data.title = title;
  }
  if (body?.game != null) {
    if (!GAMES.some((g) => g.value === body.game)) {
      return NextResponse.json({ error: "種類無效" }, { status: 400 });
    }
    data.game = String(body.game);
  }
  if (body?.cardType != null || body?.condition != null) {
    const cardType = String(body?.cardType ?? listing.cardType);
    const condition = String(body?.condition ?? listing.condition);
    if (!isValidCardType(cardType)) {
      return NextResponse.json({ error: "請選擇鑑定卡、Raw卡或未開封產品" }, { status: 400 });
    }
    if (!isValidListingCondition(cardType, condition)) {
      return NextResponse.json({ error: "品相／鑑定唔對" }, { status: 400 });
    }
    data.cardType = cardType;
    data.condition = condition;
  }
  if (body?.description != null) data.description = String(body.description).trim();
  if (body?.priceHkd != null) {
    const priceHkd = Number(body.priceHkd);
    if (!Number.isInteger(priceHkd) || priceHkd < 1) {
      return NextResponse.json({ error: "價錢無效" }, { status: 400 });
    }
    data.priceHkd = priceHkd;
  }
  if (Array.isArray(body?.images)) data.images = JSON.stringify(body.images.map(String).slice(0, 10));
  if (body?.status != null) {
    const status = String(body.status);
    if (!Object.values(LISTING_STATUS).includes(status as (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS])) {
      return NextResponse.json({ error: "狀態無效" }, { status: 400 });
    }
    data.status = status;
  }

  const updated = await prisma.listing.update({ where: { id }, data });
  if (data.priceHkd != null && data.priceHkd < listing.priceHkd) {
    await notifyListingPriceDrop(updated, listing.priceHkd);
  }
  if (data.status === LISTING_STATUS.SOLD && listing.status !== LISTING_STATUS.SOLD) {
    await notifyListingSold(updated);
  }
  return NextResponse.json({ ...updated, images: JSON.parse(updated.images) as string[] });
}

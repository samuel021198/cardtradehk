import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUS } from "@/lib/constants";
import { notifyListingSold } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || listing.sellerId !== session.user.id) {
    return NextResponse.json({ error: "找不到此商品，或你沒有權限" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const status = String(body?.status ?? "");
  if (!Object.values(LISTING_STATUS).includes(status as (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS])) {
    return NextResponse.json({ error: "狀態無效" }, { status: 400 });
  }
  if (status === LISTING_STATUS.RESERVED) {
    return NextResponse.json({ error: "請以「已保留」選擇買家，或接受出價" }, { status: 400 });
  }

  const updated = await prisma.listing.update({ where: { id }, data: { status } });
  if (status === LISTING_STATUS.SOLD && listing.status !== LISTING_STATUS.SOLD) {
    await notifyListingSold(updated);
  }
  return NextResponse.json({ id: updated.id, status: updated.status });
}

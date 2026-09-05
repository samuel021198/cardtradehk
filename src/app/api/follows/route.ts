import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const shopId = String(body?.shopId ?? "").trim();
  if (!shopId) return NextResponse.json({ error: "缺少商店" }, { status: 400 });
  if (shopId === session.user.id) {
    return NextResponse.json({ error: "唔可以關注自己" }, { status: 400 });
  }

  const shop = await prisma.user.findUnique({ where: { id: shopId } });
  if (!shop) return NextResponse.json({ error: "搵唔到呢間店" }, { status: 404 });

  const follow = await prisma.shopFollow.upsert({
    where: { userId_shopId: { userId: session.user.id, shopId } },
    update: {},
    create: { userId: session.user.id, shopId },
  });
  return NextResponse.json(follow);
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const shopId = searchParams.get("shopId")?.trim() ?? "";
  if (!shopId) return NextResponse.json({ error: "缺少商店" }, { status: 400 });

  await prisma.shopFollow.deleteMany({ where: { userId: session.user.id, shopId } });
  return NextResponse.json({ ok: true });
}

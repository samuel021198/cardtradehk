import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { featureDenied, getCurrentUser } from "@/lib/permissions";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const denied = featureDenied(me, "review");
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });

  const body = await req.json().catch(() => null);
  const dealId = String(body?.dealId ?? "");
  const rating = Number(body?.rating);
  const comment = String(body?.comment ?? "").trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "評分要係 1 至 5 星" }, { status: 400 });
  }
  if (!comment) {
    return NextResponse.json({ error: "請寫少少評論" }, { status: 400 });
  }

  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
    include: { conversation: true },
  });
  if (!deal?.completedAt) {
    return NextResponse.json({ error: "交易未完成，未可以評分" }, { status: 400 });
  }

  const { buyerId, sellerId } = deal.conversation;
  if (session.user.id !== buyerId && session.user.id !== sellerId) {
    return NextResponse.json({ error: "你唔係呢單交易嘅當事人" }, { status: 403 });
  }

  const toUserId = session.user.id === buyerId ? sellerId : buyerId;
  const existing = await prisma.review.findUnique({
    where: { dealId_fromUserId: { dealId, fromUserId: session.user.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "你已經評過呢單" }, { status: 409 });
  }

  const review = await prisma.review.create({
    data: {
      dealId,
      fromUserId: session.user.id,
      toUserId,
      rating,
      comment,
    },
  });

  return NextResponse.json(review);
}

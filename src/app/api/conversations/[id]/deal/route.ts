import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUS } from "@/lib/constants";
import { notifyListingSold } from "@/lib/notify";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: { deal: true },
  });
  if (!conversation || (conversation.buyerId !== session.user.id && conversation.sellerId !== session.user.id)) {
    return NextResponse.json({ error: "找不到對話" }, { status: 404 });
  }
  if (!conversation.listingId) {
    return NextResponse.json({ error: "拍賣對話請直接傾偈交收" }, { status: 400 });
  }

  const isBuyer = conversation.buyerId === session.user.id;
  const deal = conversation.deal
    ? await prisma.deal.update({
        where: { id: conversation.deal.id },
        data: isBuyer ? { confirmedByBuyer: true } : { confirmedBySeller: true },
      })
    : await prisma.deal.create({
        data: {
          conversationId: conversation.id,
          listingId: conversation.listingId,
          confirmedByBuyer: isBuyer,
          confirmedBySeller: !isBuyer,
        },
      });

  const both = deal.confirmedByBuyer && deal.confirmedBySeller;
  const completed = both
    ? await prisma.deal.update({
        where: { id: deal.id },
        data: { completedAt: deal.completedAt ?? new Date() },
      })
    : deal;

  if (both) {
    const sold = await prisma.listing.update({
      where: { id: conversation.listingId },
      data: { status: LISTING_STATUS.SOLD },
    });
    await notifyListingSold(sold);
  }

  return NextResponse.json(completed);
}

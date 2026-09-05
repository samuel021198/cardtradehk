import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

function parseImages(json: string) {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({
    where: { id },
    include: {
      listing: { include: { seller: { select: { id: true, displayName: true, whatsapp: true } } } },
      auction: { include: { bids: { orderBy: { amountHkd: "desc" }, take: 1 } } },
      buyer: { select: { id: true, displayName: true, whatsapp: true, avatarUrl: true } },
      seller: { select: { id: true, displayName: true, whatsapp: true, avatarUrl: true } },
      messages: { include: { sender: { select: { id: true, displayName: true, avatarUrl: true } } }, orderBy: { createdAt: "asc" } },
      deal: { include: { reviews: true } },
    },
  });

  if (!conversation || (conversation.buyerId !== session.user.id && conversation.sellerId !== session.user.id)) {
    return NextResponse.json({ error: "找不到對話" }, { status: 404 });
  }

  await prisma.conversation.update({
    where: { id },
    data:
      conversation.buyerId === session.user.id
        ? { buyerLastReadAt: new Date() }
        : { sellerLastReadAt: new Date() },
  });

  return NextResponse.json({
    ...conversation,
    listing: conversation.listing
      ? { ...conversation.listing, images: parseImages(conversation.listing.images) }
      : null,
  });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TRADE_STATUS } from "@/lib/constants";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation || (conversation.buyerId !== session.user.id && conversation.sellerId !== session.user.id)) {
    return NextResponse.json({ error: "找不到對話" }, { status: 404 });
  }

  const trade = await prisma.trade.findFirst({
    where: { conversationId: id, status: TRADE_STATUS.RESERVED },
    orderBy: { createdAt: "desc" },
  });
  if (!trade) {
    return NextResponse.json({ error: "請前往「交易中」跟進發貨與收貨" }, { status: 400 });
  }

  return NextResponse.json({ error: "請前往「交易中」：賣家確認發貨後，買家方可確認收貨。" }, { status: 400 });
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { featureDenied, getCurrentUser } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const denied = featureDenied(me, "chat");
  if (denied) return NextResponse.json({ error: denied }, { status: 403 });

  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation || (conversation.buyerId !== session.user.id && conversation.sellerId !== session.user.id)) {
    return NextResponse.json({ error: "找不到對話" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const text = String(body?.body ?? "").trim();
  if (!text) return NextResponse.json({ error: "訊息不可空白" }, { status: 400 });

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId: id, senderId: session.user.id, body: text },
      include: { sender: { select: { id: true, displayName: true } } },
    }),
    prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } }),
  ]);

  return NextResponse.json(message);
}

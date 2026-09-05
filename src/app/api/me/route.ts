import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizeHkPhone } from "@/lib/phone";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const displayName = String(body?.displayName ?? "").trim();
  const bio = String(body?.bio ?? "").trim();
  const whatsappRaw = String(body?.whatsapp ?? "").trim();
  const deliveryNote = String(body?.deliveryNote ?? "").trim();
  const paymentNote = String(body?.paymentNote ?? "").trim();

  let whatsapp: string | null = null;
  if (whatsappRaw) {
    whatsapp = normalizeHkPhone(whatsappRaw);
    if (!whatsapp) {
      return NextResponse.json({ error: "WhatsApp 號碼格式不正確" }, { status: 400 });
    }
  }

  if (displayName.length < 2) {
    return NextResponse.json({ error: "顯示名稱至少兩個字" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      displayName,
      bio: bio || null,
      whatsapp,
      deliveryNote: deliveryNote || null,
      paymentNote: paymentNote || null,
    },
    select: {
      id: true,
      displayName: true,
      bio: true,
      whatsapp: true,
      phone: true,
      deliveryNote: true,
      paymentNote: true,
    },
  });

  return NextResponse.json(user);
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { normalizeHkPhone } from "@/lib/phone";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const displayName = String(body?.displayName ?? "").trim();
  const password = String(body?.password ?? "");
  const phone = normalizeHkPhone(String(body?.phone ?? ""));

  if (!phone) {
    return NextResponse.json({ error: "請輸入有效嘅香港手機號碼（8位）" }, { status: 400 });
  }
  if (displayName.length < 2) {
    return NextResponse.json({ error: "顯示名稱至少兩個字" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密碼至少 6 個字元" }, { status: 400 });
  }

  const exists = await prisma.user.findUnique({ where: { phone } });
  if (exists) {
    return NextResponse.json({ error: "呢個電話已經註冊" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      phone,
      displayName,
      passwordHash: await bcrypt.hash(password, 10),
      whatsapp: phone,
    },
    select: { id: true, phone: true, displayName: true },
  });

  return NextResponse.json(user);
}

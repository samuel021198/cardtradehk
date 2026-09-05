import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";
import { normalizeHkPhone } from "@/lib/phone";

export async function GET(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "沒有管理員權限" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { displayName: { contains: q } },
            { phone: { contains: q.replace(/\D/g, "") } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      phone: true,
      displayName: true,
      role: true,
      status: true,
      canPost: true,
      canChat: true,
      canReview: true,
      adminNote: true,
      createdAt: true,
      _count: { select: { listings: true, reviewsReceived: true } },
    },
  });

  return NextResponse.json(users);
}

export async function POST(req: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "沒有管理員權限" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const displayName = String(body?.displayName ?? "").trim();
  const password = String(body?.password ?? "");
  const phone = normalizeHkPhone(String(body?.phone ?? ""));
  const role = body?.role === "ADMIN" ? "ADMIN" : "USER";

  if (!phone) return NextResponse.json({ error: "請輸入有效香港手機號碼" }, { status: 400 });
  if (displayName.length < 2) return NextResponse.json({ error: "顯示名稱太短" }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: "密碼至少 6 個字元" }, { status: 400 });

  const exists = await prisma.user.findUnique({ where: { phone } });
  if (exists) return NextResponse.json({ error: "呢個電話已經有戶口" }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      phone,
      displayName,
      passwordHash: await bcrypt.hash(password, 10),
      whatsapp: phone,
      role,
    },
    select: { id: true, phone: true, displayName: true, role: true, status: true },
  });

  return NextResponse.json(user);
}

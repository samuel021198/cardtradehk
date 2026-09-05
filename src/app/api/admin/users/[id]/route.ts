import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, USER_STATUS } from "@/lib/permissions";
import { normalizeHkPhone } from "@/lib/phone";
import { isMembershipTier } from "@/lib/tiers";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "沒有管理員權限" }, { status: 403 });

  const { id } = await params;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "搵唔到用戶" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const data: {
    displayName?: string;
    status?: string;
    role?: string;
    canPost?: boolean;
    canChat?: boolean;
    canReview?: boolean;
    canAuction?: boolean;
    adminNote?: string | null;
    whatsapp?: string | null;
    passwordHash?: string;
    membershipTier?: string;
  } = {};

  if (body?.displayName != null) {
    const displayName = String(body.displayName).trim();
    if (displayName.length < 2) return NextResponse.json({ error: "顯示名稱太短" }, { status: 400 });
    data.displayName = displayName;
  }

  if (body?.status != null) {
    const status = String(body.status);
    if (!Object.values(USER_STATUS).includes(status as (typeof USER_STATUS)[keyof typeof USER_STATUS])) {
      return NextResponse.json({ error: "狀態無效" }, { status: 400 });
    }
    if (id === admin.id && status === USER_STATUS.BLOCKED) {
      return NextResponse.json({ error: "唔可以封鎖自己" }, { status: 400 });
    }
    data.status = status;
  }

  if (body?.role != null) {
    const role = String(body.role);
    if (role !== "USER" && role !== "ADMIN") {
      return NextResponse.json({ error: "角色無效" }, { status: 400 });
    }
    if (id === admin.id && role !== "ADMIN") {
      return NextResponse.json({ error: "唔可以取消自己嘅管理員" }, { status: 400 });
    }
    data.role = role;
  }

  if (body?.membershipTier != null) {
    const membershipTier = String(body.membershipTier);
    if (!isMembershipTier(membershipTier)) {
      return NextResponse.json({ error: "會員級別無效" }, { status: 400 });
    }
    data.membershipTier = membershipTier;
  }

  if (typeof body?.canPost === "boolean") data.canPost = body.canPost;
  if (typeof body?.canChat === "boolean") data.canChat = body.canChat;
  if (typeof body?.canReview === "boolean") data.canReview = body.canReview;
  if (typeof body?.canAuction === "boolean") data.canAuction = body.canAuction;
  if (body?.adminNote != null) data.adminNote = String(body.adminNote).trim() || null;

  if (body?.whatsapp != null) {
    const raw = String(body.whatsapp).trim();
    if (!raw) data.whatsapp = null;
    else {
      const whatsapp = normalizeHkPhone(raw);
      if (!whatsapp) return NextResponse.json({ error: "WhatsApp 號碼無效" }, { status: 400 });
      data.whatsapp = whatsapp;
    }
  }

  if (body?.password) {
    const password = String(body.password);
    if (password.length < 6) return NextResponse.json({ error: "新密碼至少 6 個字元" }, { status: 400 });
    data.passwordHash = await bcrypt.hash(password, 10);
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
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
      whatsapp: true,
      membershipTier: true,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "沒有管理員權限" }, { status: 403 });

  const { id } = await params;
  if (id === admin.id) return NextResponse.json({ error: "唔可以刪除自己" }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return NextResponse.json({ error: "搵唔到用戶" }, { status: 404 });

  if (user.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json({ error: "唔可以刪除最後一個管理員" }, { status: 400 });
    }
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

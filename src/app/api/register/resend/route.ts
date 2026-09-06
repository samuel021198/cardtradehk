import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeHkPhone } from "@/lib/phone";
import { parseEmail } from "@/lib/email";
import { issueSignupCode } from "@/lib/signup";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const phone = normalizeHkPhone(String(body?.phone ?? ""));
  const email = parseEmail(String(body?.email ?? ""));
  if (!phone || !email) {
    return NextResponse.json({ error: "請提供電話及電郵" }, { status: 400 });
  }

  const pending = await prisma.pendingSignup.findUnique({ where: { phone } });
  if (!pending || pending.email !== email) {
    return NextResponse.json({ error: "找不到待認證的申請，請重新開戶。" }, { status: 400 });
  }

  try {
    const result = await issueSignupCode({
      phone: pending.phone,
      email: pending.email,
      displayName: pending.displayName,
      passwordHash: pending.passwordHash,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      ok: true,
      ...(result.devCode ? { devCode: result.devCode } : {}),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "無法發送驗證電郵" }, { status: 500 });
  }
}

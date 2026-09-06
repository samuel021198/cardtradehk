import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { normalizeHkPhone } from "@/lib/phone";
import { parseEmail } from "@/lib/email";
import { issueSignupCode } from "@/lib/signup";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const displayName = String(body?.displayName ?? "").trim();
  const password = String(body?.password ?? "");
  const passwordConfirm = String(body?.passwordConfirm ?? "");
  const phone = normalizeHkPhone(String(body?.phone ?? ""));
  const email = parseEmail(String(body?.email ?? ""));

  if (!phone) {
    return NextResponse.json({ error: "請輸入有效的香港手機號碼（8位）。每個號碼只可開戶一次。" }, { status: 400 });
  }
  if (!email) {
    return NextResponse.json({ error: "請輸入有效的電郵地址" }, { status: 400 });
  }
  if (displayName.length < 2) {
    return NextResponse.json({ error: "顯示名稱至少兩個字" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密碼至少 6 個字元" }, { status: 400 });
  }
  if (password !== passwordConfirm) {
    return NextResponse.json({ error: "兩次輸入的密碼不一致" }, { status: 400 });
  }

  try {
    const result = await issueSignupCode({
      phone,
      email,
      displayName,
      passwordHash: await bcrypt.hash(password, 10),
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({
      ok: true,
      phone: result.phone,
      email: result.email,
      ...(result.devCode ? { devCode: result.devCode } : {}),
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "無法發送驗證電郵" }, { status: 500 });
  }
}

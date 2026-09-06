import { NextResponse } from "next/server";
import { normalizeHkPhone } from "@/lib/phone";
import { parseEmail } from "@/lib/email";
import { confirmSignup } from "@/lib/signup";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const phone = normalizeHkPhone(String(body?.phone ?? ""));
  const email = parseEmail(String(body?.email ?? ""));
  const code = String(body?.code ?? "").trim();

  if (!phone || !email) {
    return NextResponse.json({ error: "請提供電話及電郵" }, { status: 400 });
  }
  if (!/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "請輸入 6 位驗證碼" }, { status: 400 });
  }

  const result = await confirmSignup(phone, email, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, phone: result.user.phone });
}

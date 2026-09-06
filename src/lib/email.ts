function normalizeEmail(input: string) {
  return input.trim().toLowerCase();
}

export function parseEmail(input: string) {
  const email = normalizeEmail(input);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) return null;
  return email;
}

export function makeVerifyCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function sendVerifyEmail(email: string, code: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "CardTradeHK <onboarding@resend.dev>";
  const text = `你的 CardTradeHK 開戶驗證碼是 ${code}，15 分鐘內有效。若不是你本人申請，請忽略此電郵。`;

  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("尚未設定電郵發送，暫時無法完成認證");
    }
    console.info(`[dev] 開戶驗證碼 ${email}: ${code}`);
    return { sent: false as const };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "CardTradeHK 開戶驗證碼",
      text,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || "電郵發送失敗");
  }
  return { sent: true as const };
}

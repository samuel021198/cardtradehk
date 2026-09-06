import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { makeVerifyCode, sendVerifyEmail } from "@/lib/email";

const CODE_TTL_MS = 15 * 60 * 1000;
const RESEND_GAP_MS = 60 * 1000;

export async function issueSignupCode(opts: {
  phone: string;
  email: string;
  displayName: string;
  passwordHash: string;
}) {
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ phone: opts.phone }, { email: opts.email }] },
    select: { phone: true, email: true },
  });
  if (existingUser?.phone === opts.phone) {
    return { ok: false as const, status: 409, error: "此電話已開戶，每個號碼只可申請一次。" };
  }
  if (existingUser?.email === opts.email) {
    return { ok: false as const, status: 409, error: "此電郵已登記，請改用其他電郵或直接登入。" };
  }

  const pending = await prisma.pendingSignup.findFirst({
    where: { OR: [{ phone: opts.phone }, { email: opts.email }] },
  });
  if (pending && pending.sentAt.getTime() > Date.now() - RESEND_GAP_MS && pending.phone === opts.phone && pending.email === opts.email) {
    return { ok: false as const, status: 429, error: "驗證碼剛已發送，請稍後再試。" };
  }

  const code = makeVerifyCode();
  const data = {
    phone: opts.phone,
    email: opts.email,
    displayName: opts.displayName,
    passwordHash: opts.passwordHash,
    codeHash: await bcrypt.hash(code, 8),
    sentAt: new Date(),
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
  };

  await prisma.pendingSignup.deleteMany({
    where: { OR: [{ phone: opts.phone }, { email: opts.email }] },
  });
  await prisma.pendingSignup.create({ data });

  const mail = await sendVerifyEmail(opts.email, code);
  return { ok: true as const, email: opts.email, phone: opts.phone, devCode: mail.sent ? undefined : code };
}

export async function confirmSignup(phone: string, email: string, code: string) {
  const pending = await prisma.pendingSignup.findUnique({ where: { phone } });
  if (!pending || pending.email !== email) {
    return { ok: false as const, status: 400, error: "找不到待認證的申請，請重新開戶。" };
  }
  if (pending.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, status: 400, error: "驗證碼已過期，請重新發送。" };
  }
  const match = await bcrypt.compare(code.trim(), pending.codeHash);
  if (!match) {
    return { ok: false as const, status: 400, error: "驗證碼不正確。" };
  }

  const clash = await prisma.user.findFirst({
    where: { OR: [{ phone: pending.phone }, { email: pending.email }] },
    select: { id: true },
  });
  if (clash) {
    await prisma.pendingSignup.delete({ where: { id: pending.id } });
    return { ok: false as const, status: 409, error: "此電話或電郵已開戶。" };
  }

  const user = await prisma.user.create({
    data: {
      phone: pending.phone,
      email: pending.email,
      emailVerifiedAt: new Date(),
      displayName: pending.displayName,
      passwordHash: pending.passwordHash,
      whatsapp: pending.phone,
    },
    select: { id: true, phone: true, displayName: true },
  });
  await prisma.pendingSignup.delete({ where: { id: pending.id } });
  return { ok: true as const, user };
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NOTIFICATION_TYPE, notifyAdmins } from "@/lib/notify";
import { REPORT_REASONS, reportReasonLabel } from "@/lib/tiers";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const targetUserId = String(body?.targetUserId ?? "").trim();
  const reason = String(body?.reason ?? "").trim();
  const note = String(body?.note ?? "").trim();
  if (!targetUserId) return NextResponse.json({ error: "缺少帳戶" }, { status: 400 });
  if (targetUserId === session.user.id) return NextResponse.json({ error: "不可檢舉自己" }, { status: 400 });
  if (!REPORT_REASONS.some((r) => r.value === reason)) {
    return NextResponse.json({ error: "請選擇檢舉原因" }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetUserId } });
  if (!target) return NextResponse.json({ error: "找不到此帳戶" }, { status: 404 });

  const recent = await prisma.report.findFirst({
    where: {
      reporterId: session.user.id,
      targetUserId,
      createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  if (recent) return NextResponse.json({ error: "你已檢舉此帳戶，請等候管理員處理" }, { status: 400 });

  const report = await prisma.report.create({
    data: {
      reporterId: session.user.id,
      targetUserId,
      reason: note ? `${reason}：${note.slice(0, 200)}` : reason,
    },
  });

  await notifyAdmins({
    type: NOTIFICATION_TYPE.REPORT,
    title: "有新檢舉",
    body: `${session.user.displayName} 檢舉「${target.displayName}」：${reportReasonLabel(reason)}${note ? `（${note.slice(0, 80)}）` : ""}`,
    href: `/admin/reports`,
    shopId: targetUserId,
  });

  return NextResponse.json(report);
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "沒有管理員權限" }, { status: 403 });

  const reports = await prisma.report.findMany({
    include: {
      reporter: { select: { id: true, displayName: true } },
      target: { select: { id: true, displayName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json(reports);
}

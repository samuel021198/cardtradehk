import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Params) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "沒有管理員權限" }, { status: 403 });
  const { id } = await params;
  const status = String((await req.json().catch(() => null))?.status ?? "");
  if (status !== "OPEN" && status !== "DONE") {
    return NextResponse.json({ error: "狀態無效" }, { status: 400 });
  }
  const report = await prisma.report.update({ where: { id }, data: { status } });
  return NextResponse.json(report);
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savePublicImage } from "@/lib/storage";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "請先登入" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "請選擇頭像" }, { status: 400 });
  if (!ALLOWED.has(file.type) || file.size > 3 * 1024 * 1024) {
    return NextResponse.json({ error: "只接受 3MB 以內嘅 JPG／PNG／WEBP" }, { status: 400 });
  }

  const avatarUrl = await savePublicImage({
    buffer: Buffer.from(await file.arrayBuffer()),
    mime: file.type,
    folder: "avatars",
  });

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { avatarUrl },
    select: { id: true, avatarUrl: true },
  });
  return NextResponse.json(user);
}

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { featureDenied, getCurrentUser } from "@/lib/permissions";
import { savePublicImage } from "@/lib/storage";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "請先登入" }, { status: 401 });
  const deniedPost = featureDenied(me, "post");
  const deniedAuction = featureDenied(me, "auction");
  if (deniedPost && deniedAuction) {
    return NextResponse.json({ error: deniedPost }, { status: 403 });
  }

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "請選擇圖片" }, { status: 400 });
  }
  if (files.length > 10) {
    return NextResponse.json({ error: "最多上傳 10 張相" }, { status: 400 });
  }

  const urls: string[] = [];
  for (const file of files) {
    if (!ALLOWED.has(file.type) || file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "只接受 5MB 以內的 JPG／PNG／WEBP" }, { status: 400 });
    }
    urls.push(
      await savePublicImage({
        buffer: Buffer.from(await file.arrayBuffer()),
        mime: file.type,
        folder: "listings",
      }),
    );
  }

  return NextResponse.json({ urls });
}

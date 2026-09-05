import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

export function cloudinaryReady() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );
}

function extOf(mime: string) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

export async function savePublicImage(opts: {
  buffer: Buffer;
  mime: string;
  folder: string;
}) {
  const ext = extOf(opts.mime);
  const id = randomUUID();

  if (cloudinaryReady()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    const uploaded = await cloudinary.uploader.upload(`data:${opts.mime};base64,${opts.buffer.toString("base64")}`, {
      folder: `cardtradehk/${opts.folder}`,
      public_id: id,
      resource_type: "image",
    });
    return uploaded.secure_url;
  }

  const dir = path.join(process.cwd(), "public", "uploads", opts.folder === "root" ? "" : opts.folder);
  await mkdir(dir, { recursive: true });
  const filename = `${id}.${ext}`;
  await writeFile(path.join(dir, filename), opts.buffer);
  return opts.folder === "root" ? `/uploads/${filename}` : `/uploads/${opts.folder}/${filename}`;
}

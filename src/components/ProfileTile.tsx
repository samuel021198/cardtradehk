"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CoverImage } from "@/components/CoverImage";

export function ProfileTile({
  href,
  title,
  image,
  priceLabel,
  pinned = false,
  canPin = false,
  listingId,
  auctionId,
}: {
  href: string;
  title: string;
  image?: string;
  priceLabel?: string;
  pinned?: boolean;
  canPin?: boolean;
  listingId?: string;
  auctionId?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function togglePin(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, auctionId }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="relative">
      <Link href={href} className="group block overflow-hidden bg-[var(--chip)]">
        <div className="relative aspect-square">
          <CoverImage src={image} alt={title} />
          {priceLabel && (
            <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-black text-[var(--accent)]">
              {priceLabel}
            </span>
          )}
          {pinned && (
            <span className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white" title="精選">
              📌
            </span>
          )}
        </div>
      </Link>
      {canPin && (
        <button
          type="button"
          className="absolute left-1 top-1 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-bold text-white"
          onClick={togglePin}
          disabled={busy}
        >
          {busy ? "…" : pinned ? "取消釘" : "釘選"}
        </button>
      )}
    </div>
  );
}

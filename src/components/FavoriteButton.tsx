"use client";

import { MouseEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function FavoriteButton({
  listingId,
  auctionId,
  initialFavorited = false,
  className = "",
}: {
  listingId?: string;
  auctionId?: string;
  initialFavorited?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);

  async function toggle(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const next = !on;
    setOn(next);
    const res = next
      ? await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listingId, auctionId }),
        })
      : await fetch(`/api/favorites?${listingId ? `listingId=${listingId}` : `auctionId=${auctionId}`}`, {
          method: "DELETE",
        });
    setBusy(false);
    if (res.status === 401) {
      setOn(false);
      router.push(`/login?callbackUrl=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname : "/")}`);
      return;
    }
    if (!res.ok) {
      setOn(!next);
      return;
    }
    router.refresh();
  }

  return (
    <button
      type="button"
      aria-label={on ? "取消收藏" : "加入收藏"}
      className={`grid h-9 w-9 place-items-center rounded-full bg-black/70 text-lg leading-none shadow ${className}`}
      onClick={toggle}
      disabled={busy}
    >
      <span className={on ? "text-rose-400" : "text-white"}>{on ? "♥" : "♡"}</span>
    </button>
  );
}

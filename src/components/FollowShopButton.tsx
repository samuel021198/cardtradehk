"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FollowShopButton({
  shopId,
  initialFollowing = false,
  iconOnly = false,
}: {
  shopId: string;
  initialFollowing?: boolean;
  iconOnly?: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !on;
    setOn(next);
    const res = next
      ? await fetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shopId }),
        })
      : await fetch(`/api/follows?shopId=${shopId}`, { method: "DELETE" });
    setBusy(false);
    if (res.status === 401) {
      setOn(false);
      router.push(`/login?callbackUrl=/users/${shopId}`);
      return;
    }
    if (!res.ok) setOn(!next);
    else router.refresh();
  }

  if (iconOnly) {
    return (
      <button
        className={`grid h-10 w-10 place-items-center rounded-full border ${on ? "border-[var(--accent)] bg-[var(--accent)] text-black" : "border-[var(--line)]"}`}
        type="button"
        onClick={toggle}
        disabled={busy}
        title={on ? "已收藏此商店" : "收藏商店"}
      >
        {busy ? "…" : on ? "★" : "☆"}
      </button>
    );
  }

  return (
    <button className={on ? "btn-secondary" : "btn-primary"} type="button" onClick={toggle} disabled={busy}>
      {busy ? "處理中…" : on ? "已關注商店" : "關注商店"}
    </button>
  );
}

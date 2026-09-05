"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ShopChatButton({ shopId }: { shopId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function open() {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopId }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.status === 401) {
      router.push(`/login?callbackUrl=/users/${shopId}`);
      return;
    }
    if (res.ok) router.push(`/messages/${data.id}`);
  }

  return (
    <button type="button" className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)]" onClick={open} disabled={busy} title="傳送訊息">
      {busy ? "…" : "💬"}
    </button>
  );
}

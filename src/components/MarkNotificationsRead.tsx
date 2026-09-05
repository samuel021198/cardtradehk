"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MarkNotificationsRead() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function markAll() {
    setBusy(true);
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <button className="btn-secondary" type="button" onClick={markAll} disabled={busy}>
      {busy ? "處理中…" : "全部標為已讀"}
    </button>
  );
}

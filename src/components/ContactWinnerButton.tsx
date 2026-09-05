"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ContactWinnerButton({
  auctionId,
  label = "聯絡得標者",
}: {
  auctionId: string;
  label?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function openChat() {
    setError("");
    setLoading(true);
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auctionId }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      if (res.status === 401) {
        router.push(`/login?callbackUrl=/auctions/${auctionId}`);
        return;
      }
      setError(json.error || "開唔到傾偈");
      return;
    }
    router.push(`/messages/${json.id}`);
  }

  return (
    <div className="space-y-2">
      <button className="btn-primary w-full" type="button" onClick={openChat} disabled={loading}>
        {loading ? "開緊對話…" : label}
      </button>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}

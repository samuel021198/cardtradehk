"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { whatsappLink } from "@/lib/phone";

export function ContactActions({
  listingId,
  listingTitle,
  sellerWhatsapp,
}: {
  listingId: string;
  listingTitle: string;
  sellerWhatsapp?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function startChat() {
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/login?callbackUrl=/listings/${listingId}`);
        return;
      }
      if (!res.ok) throw new Error(data.error || "開唔到對話");
      router.push(`/messages/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "出咗錯");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button className="btn-primary w-full" disabled={pending} type="button" onClick={startChat}>
        {pending ? "開啟緊…" : "站內傾偈"}
      </button>
      {sellerWhatsapp ? (
        <a
          className="btn-secondary w-full"
          href={whatsappLink(sellerWhatsapp, `你好，我想問吓「${listingTitle}」仲喺唔喺？`)}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp 賣家
        </a>
      ) : (
        <p className="text-center text-xs text-[var(--muted)]">賣家未公開 WhatsApp</p>
      )}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AuctionBidBox({
  auctionId,
  minNext,
  live,
}: {
  auctionId: string;
  minNext: number;
  live: boolean;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(minNext));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch(`/api/auctions/${auctionId}/bids`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountHkd: Number(amount) }),
      });
      const data = await res.json();
      if (res.status === 401) {
        router.push(`/login?callbackUrl=/auctions/${auctionId}`);
        return;
      }
      if (!res.ok) throw new Error(data.error || "出價失敗");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setPending(false);
    }
  }

  if (!live) return <p className="text-sm font-semibold">此拍賣已結束。得標者請以訊息或 WhatsApp 與賣家交收。</p>;

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <label className="block space-y-1 text-sm font-semibold">
        你的出價（至少 HK${minNext}）
        <input className="field font-normal" type="number" min={minNext} value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </label>
      <p className="text-xs text-[var(--muted)]">
        剩餘時間以 日：小時：分鐘：秒 顯示。完結前 10 分鐘內出價會自動加 5 分鐘，可以連續加時。
      </p>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={pending} type="submit">
        {pending ? "提交中…" : "出價"}
      </button>
    </form>
  );
}

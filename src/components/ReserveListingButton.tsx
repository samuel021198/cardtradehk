"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Buyer = { id: string; displayName: string; lastOfferHkd: number | null };

export function ReserveListingButton({
  listingId,
  compact = false,
}: {
  listingId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [listPrice, setListPrice] = useState(0);
  const [buyerId, setBuyerId] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    setError("");
    const res = await fetch(`/api/listings/${listingId}/buyers`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "載入買家失敗");
      return;
    }
    setBuyers(json.buyers ?? []);
    setListPrice(json.listPriceHkd ?? 0);
    setAmount(String(json.listPriceHkd ?? ""));
    if (json.buyers?.[0]) {
      setBuyerId(json.buyers[0].id);
      if (json.buyers[0].lastOfferHkd) setAmount(String(json.buyers[0].lastOfferHkd));
    }
    setOpen(true);
  }

  async function submit() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/listings/${listingId}/reserve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerId, amountHkd: Number(amount) }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "保留失敗");
      return;
    }
    router.push("/trades");
  }

  const btn = compact ? "btn-secondary !px-3 !py-1.5 text-xs" : "btn-secondary w-full";

  return (
    <div className="space-y-2">
      <button className={btn} type="button" onClick={start}>
        已保留
      </button>
      {open && (
        <div className="space-y-2 rounded-2xl border border-[var(--line)] bg-[var(--chip)] p-3">
          {buyers.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">尚未有曾對話或出價的買家。請先於對話確認對方，或待買家出價後接受。</p>
          ) : (
            <>
              <label className="block space-y-1 text-xs font-semibold">
                保留予哪位買家
                <select
                  className="field text-sm font-normal"
                  value={buyerId}
                  onChange={(e) => {
                    const next = e.target.value;
                    setBuyerId(next);
                    const found = buyers.find((b) => b.id === next);
                    if (found?.lastOfferHkd) setAmount(String(found.lastOfferHkd));
                    else setAmount(String(listPrice));
                  }}
                >
                  {buyers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.displayName}
                      {b.lastOfferHkd ? ` · 出價 $${b.lastOfferHkd}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-xs font-semibold">
                成交價 HK$
                <input className="field text-sm font-normal" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              <button className="btn-primary w-full" type="button" disabled={busy} onClick={submit}>
                {busy ? "保留中…" : "確認已保留"}
              </button>
            </>
          )}
          <button className="btn-secondary w-full" type="button" onClick={() => setOpen(false)}>
            取消
          </button>
        </div>
      )}
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}

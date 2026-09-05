"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Offer = {
  id: string;
  amountHkd: number;
  note: string | null;
  status: string;
  proposedById: string;
  buyerId: string;
  sellerId: string;
};

export function OfferPanel({
  listingId,
  listPrice,
  meId,
  offer,
}: {
  listingId: string;
  listPrice: number;
  meId: string;
  offer: Offer | null;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(String(offer?.amountHkd ?? Math.max(1, listPrice - 10)));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  const pending = offer?.status === "PENDING";
  const myTurn = pending && offer.proposedById !== meId;
  const iProposed = pending && offer.proposedById === meId;

  async function createOffer(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy("create");
    const res = await fetch("/api/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, amountHkd: Number(amount), note }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy("");
    if (res.status === 401) {
      router.push(`/login?callbackUrl=/listings/${listingId}`);
      return;
    }
    if (!res.ok) {
      setError(json.error || "出價失敗");
      return;
    }
    setNote("");
    router.refresh();
  }

  async function act(action: string, extra: Record<string, unknown> = {}) {
    if (!offer) return;
    setError("");
    setBusy(action);
    const res = await fetch(`/api/offers/${offer.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setError(json.error || "操作失敗");
      return;
    }
    if (action === "accept") router.push("/trades");
    else router.refresh();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--line)] p-4">
      <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">出價議價</div>
      {!offer || offer.status === "DECLINED" || offer.status === "CANCELLED" ? (
        <form onSubmit={createOffer} className="space-y-2">
          <label className="block space-y-1 text-sm font-semibold">
            你的出價（HK$）
            <input className="field font-normal" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </label>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="可選：面交地點／備註" />
          <button className="btn-primary w-full" type="submit" disabled={Boolean(busy)}>
            {busy === "create" ? "送出中…" : "向賣家出價"}
          </button>
        </form>
      ) : offer.status === "ACCEPTED" ? (
        <p className="text-sm font-semibold">此出價已獲接受，商品已保留。請前往「交易中」跟進交收。</p>
      ) : (
        <div className="space-y-2">
          <p className="font-black text-[var(--accent)]">目前出價 HK${offer.amountHkd}</p>
          {offer.note && <p className="text-sm text-[var(--muted)]">{offer.note}</p>}
          <p className="text-sm text-[var(--muted)]">{iProposed ? "已送出，等候對方回覆。" : "輪到你回覆：可接受、拒絕或還價。"}</p>
          {myTurn && (
            <>
              <div className="flex flex-wrap gap-2">
                <button className="btn-primary" type="button" disabled={Boolean(busy)} onClick={() => act("accept")}>
                  {busy === "accept" ? "處理中…" : "接受出價"}
                </button>
                <button className="btn-secondary" type="button" disabled={Boolean(busy)} onClick={() => act("decline")}>
                  拒絕
                </button>
              </div>
              <div className="flex gap-2">
                <input className="field flex-1" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
                <button className="btn-secondary" type="button" disabled={Boolean(busy)} onClick={() => act("counter", { amountHkd: Number(amount), note })}>
                  還價
                </button>
              </div>
              <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="還價備註（可空）" />
            </>
          )}
          {iProposed && (
            <button className="btn-secondary w-full" type="button" disabled={Boolean(busy)} onClick={() => act("cancel")}>
              收回出價
            </button>
          )}
        </div>
      )}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}

export function SellerOfferList({
  meId,
  listPrice,
  offers,
}: {
  meId: string;
  listPrice: number;
  offers: Offer[];
}) {
  const pending = offers.filter((o) => o.status === "PENDING");
  if (pending.length === 0) return <p className="text-sm text-[var(--muted)]">暫時未有待回覆出價。</p>;
  return (
    <div className="space-y-3">
      {pending.map((offer) => (
        <OfferPanel key={offer.id} listingId="" listPrice={listPrice} meId={meId} offer={offer} />
      ))}
    </div>
  );
}

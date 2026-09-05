"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TradeActions({
  tradeId,
  isSeller,
  isBuyer,
  sellerShipped,
  buyerReceived,
  source,
  winnerAcked,
  respondBy,
}: {
  tradeId: string;
  isSeller: boolean;
  isBuyer: boolean;
  sellerShipped: boolean;
  buyerReceived: boolean;
  source?: string;
  winnerAcked?: boolean;
  respondBy?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const auction = source === "AUCTION";
  const overdue = Boolean(respondBy && new Date(respondBy).getTime() <= Date.now() && !winnerAcked);

  async function act(action: string) {
    setError("");
    setBusy(action);
    const res = await fetch(`/api/trades/${tradeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) {
      setError(json.error || "操作失敗");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-1 text-xs font-semibold text-[var(--muted)]">
        <li className={sellerShipped ? "text-emerald-500" : "text-[var(--ink)]"}>
          1. 賣家確認發貨 {sellerShipped ? "✓" : "· 進行中"}
        </li>
        <li className={buyerReceived ? "text-emerald-500" : sellerShipped ? "text-[var(--ink)]" : ""}>
          2. 買家確認收貨 {buyerReceived ? "✓" : sellerShipped ? "· 等買家" : "· 等發貨後"}
        </li>
        <li>3. 雙方互評</li>
      </ol>

      {auction && isBuyer && !winnerAcked && (
        <button className="btn-primary w-full" type="button" disabled={Boolean(busy)} onClick={() => act("ack")}>
          {busy === "ack" ? "確認中…" : "確認得標，並跟進交收"}
        </button>
      )}
      {auction && winnerAcked && <p className="text-sm font-semibold text-emerald-500">得標者已確認</p>}
      {auction && !winnerAcked && respondBy && (
        <p className="text-xs text-[var(--muted)]">確認限期：{new Date(respondBy).toLocaleString("zh-HK")}</p>
      )}

      {isSeller && !sellerShipped && (
        <button className="btn-primary w-full" type="button" disabled={Boolean(busy)} onClick={() => act("ship")}>
          {busy === "ship" ? "更新中…" : "確認已發貨／已交收"}
        </button>
      )}
      {isSeller && sellerShipped && !buyerReceived && (
        <p className="text-sm font-semibold text-emerald-500">已發貨。等買家確認收貨之後先完成。</p>
      )}

      {isBuyer && !sellerShipped && (
        <p className="text-sm text-[var(--muted)]">賣家確認發貨後，方可確認收貨。</p>
      )}
      {isBuyer && sellerShipped && !buyerReceived && (
        <button className="btn-primary w-full" type="button" disabled={Boolean(busy)} onClick={() => act("receive")}>
          {busy === "receive" ? "更新中…" : "確認已收貨，完成交易"}
        </button>
      )}
      {isBuyer && buyerReceived && <p className="text-sm font-semibold text-emerald-500">你已確認收貨</p>}

      {auction && ((isBuyer && !sellerShipped) || (isSeller && overdue && !winnerAcked)) && (
        <button className="btn-secondary w-full" type="button" disabled={Boolean(busy)} onClick={() => act("abandon")}>
          {busy === "abandon" ? "處理中…" : isSeller ? "標記得標者棄單" : "放棄此交易"}
        </button>
      )}
      {isSeller && !auction && !sellerShipped && (
        <button className="btn-secondary w-full" type="button" disabled={Boolean(busy)} onClick={() => act("cancel")}>
          {busy === "cancel" ? "取消中…" : "取消保留，重新放售"}
        </button>
      )}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}

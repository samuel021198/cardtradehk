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
    <div className="space-y-2">
      {auction && isBuyer && !winnerAcked && (
        <button className="btn-primary w-full" type="button" disabled={Boolean(busy)} onClick={() => act("ack")}>
          {busy === "ack" ? "確認緊…" : "確認得標，會跟進交收"}
        </button>
      )}
      {auction && winnerAcked && <p className="text-sm font-semibold text-emerald-500">得標者已確認</p>}
      {auction && !winnerAcked && respondBy && (
        <p className="text-xs text-[var(--muted)]">確認限期：{new Date(respondBy).toLocaleString("zh-HK")}</p>
      )}
      {isSeller && !sellerShipped && (
        <button className="btn-primary w-full" type="button" disabled={Boolean(busy)} onClick={() => act("ship")}>
          {busy === "ship" ? "更新緊…" : "確認發貨／已交收"}
        </button>
      )}
      {isSeller && sellerShipped && <p className="text-sm font-semibold text-emerald-500">你已確認發貨／交收</p>}
      {isBuyer && !buyerReceived && (
        <button className="btn-primary w-full" type="button" disabled={Boolean(busy)} onClick={() => act("receive")}>
          {busy === "receive" ? "更新緊…" : "確認收貨"}
        </button>
      )}
      {isBuyer && buyerReceived && <p className="text-sm font-semibold text-emerald-500">你已確認收貨</p>}
      {auction && ((isBuyer && !sellerShipped) || (isSeller && overdue && !winnerAcked)) && (
        <button className="btn-secondary w-full" type="button" disabled={Boolean(busy)} onClick={() => act("abandon")}>
          {busy === "abandon" ? "處理緊…" : isSeller ? "標記得標者棄單" : "我要棄單"}
        </button>
      )}
      {isSeller && !auction && (
        <button className="btn-secondary w-full" type="button" disabled={Boolean(busy)} onClick={() => act("cancel")}>
          {busy === "cancel" ? "取消緊…" : "取消保留，重新放售"}
        </button>
      )}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}

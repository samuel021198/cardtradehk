"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ReserveListingButton } from "@/components/ReserveListingButton";

export function SellerListingActions({
  listingId,
  status,
  compact = false,
}: {
  listingId: string;
  status: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState("");
  const btn = compact ? "btn-primary !px-3 !py-1.5 text-xs" : "btn-primary w-full";
  const btnAlt = compact ? "btn-secondary !px-3 !py-1.5 text-xs" : "btn-secondary w-full";

  async function setStatus(next: string) {
    setError("");
    setLoading(next);
    const res = await fetch(`/api/listings/${listingId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const json = await res.json().catch(() => ({}));
    setLoading("");
    if (!res.ok) {
      setError(json.error || "更新失敗");
      return;
    }
    router.refresh();
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <div className="flex flex-wrap gap-2">
        {status === "ACTIVE" && (
          <button className={btn} type="button" disabled={Boolean(loading)} onClick={() => setStatus("SOLD")}>
            {loading === "SOLD" ? "更新中…" : "標記已出售"}
          </button>
        )}
        {status === "RESERVED" && (
          <Link className={btn} href="/trades">
            前往交易中
          </Link>
        )}
        {status === "SOLD" && (
          <button className={btn} type="button" disabled={Boolean(loading)} onClick={() => setStatus("ACTIVE")}>
            {loading === "ACTIVE" ? "更新中…" : "重新上架"}
          </button>
        )}
        {status === "HIDDEN" && (
          <button className={btn} type="button" disabled={Boolean(loading)} onClick={() => setStatus("ACTIVE")}>
            {loading === "ACTIVE" ? "更新中…" : "重新上架"}
          </button>
        )}
        {status === "ACTIVE" && (
          <button className={btnAlt} type="button" disabled={Boolean(loading)} onClick={() => setStatus("HIDDEN")}>
            {loading === "HIDDEN" ? "更新中…" : "隱藏"}
          </button>
        )}
        {status === "ACTIVE" && <ReserveListingButton listingId={listingId} compact={compact} />}
        <Link className={btnAlt} href={`/listings/${listingId}/edit`}>
          編輯
        </Link>
      </div>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}

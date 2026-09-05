"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ReviewForm({
  tradeId,
  otherName,
  compact = false,
}: {
  tradeId: string;
  otherName: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tradeId, rating, comment }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "評分失敗");
      return;
    }
    setDone(true);
    router.refresh();
  }

  if (done) {
    return <p className="text-sm font-semibold text-emerald-500">已送出對 {otherName} 嘅評分。</p>;
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3 rounded-2xl border border-[var(--accent)]/40 bg-[var(--chip)] p-4"}>
      {!compact && (
        <div>
          <p className="text-sm font-black">評價 {otherName}</p>
          <p className="text-xs text-[var(--muted)]">交易已完成。寫低交收、卡況同態度，方便其他卡友。</p>
        </div>
      )}
      {compact && <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">評價 {otherName}</div>}
      <div className="flex gap-1" role="radiogroup" aria-label="星級">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} 星`}
            className={`text-2xl leading-none ${n <= rating ? "text-[var(--accent)]" : "text-[var(--line)]"}`}
            onClick={() => setRating(n)}
          >
            ★
          </button>
        ))}
        <span className="ml-2 self-center text-sm font-bold">{rating} 星</span>
      </div>
      <textarea
        className="field min-h-24"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="例如：準時面交、卡同相一樣、包裝穩陣…"
      />
      <button className="btn-primary w-full" type="button" disabled={busy} onClick={submit}>
        {busy ? "送出緊…" : "送出評分"}
      </button>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { REPORT_REASONS } from "@/lib/tiers";

export function ReportUserButton({ targetUserId, targetName }: { targetUserId: string; targetName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].value);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError("");
    setOk("");
    setBusy(true);
    const res = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId, reason, note }),
    });
    const data = await res.json();
    setBusy(false);
    if (res.status === 401) {
      router.push(`/login?callbackUrl=/users/${targetUserId}`);
      return;
    }
    if (!res.ok) {
      setError(data.error || "檢舉失敗");
      return;
    }
    setOk("已通知管理員");
    setNote("");
  }

  return (
    <>
      <button
        type="button"
        className="grid h-10 w-10 place-items-center rounded-full border border-[var(--line)]"
        title="檢舉"
        onClick={() => setOpen(true)}
      >
        ⚑
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" onClick={() => setOpen(false)}>
          <div className="card w-full max-w-md space-y-3 p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-black">檢舉 {targetName}</h2>
            <p className="text-sm text-[var(--muted)]">管理員會即時收到通知，方便跟進呢個帳戶。</p>
            <label className="block space-y-1 text-sm font-semibold">
              原因
              <select className="field font-normal" value={reason} onChange={(e) => setReason(e.target.value)}>
                {REPORT_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1 text-sm font-semibold">
              補充（可選）
              <textarea className="field min-h-24 font-normal" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
            {ok && <p className="text-sm font-semibold text-emerald-500">{ok}</p>}
            <div className="flex gap-2">
              <button className="btn-secondary flex-1" type="button" onClick={() => setOpen(false)}>
                關閉
              </button>
              <button className="btn-primary flex-1" type="button" disabled={busy} onClick={submit}>
                {busy ? "提交緊…" : "提交檢舉"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

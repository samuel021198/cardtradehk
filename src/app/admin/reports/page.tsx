"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { reportReasonLabel } from "@/lib/tiers";

type ReportRow = {
  id: string;
  reason: string;
  status: string;
  createdAt: string;
  reporter: { id: string; displayName: string };
  target: { id: string; displayName: string };
};

export default function AdminReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/reports");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "讀取失敗");
      return;
    }
    setRows(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function mark(id: string, status: string) {
    await fetch(`/api/admin/reports/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  return (
    <div className="card space-y-4 p-5">
      <h2 className="text-xl font-black">檢舉列表</h2>
      {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
      {rows.length === 0 ? (
        <p className="text-[var(--muted)]">暫時未有檢舉。</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <article key={r.id} className="rounded-2xl border border-[var(--line)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-black">
                  <Link className="hover:text-[var(--accent)]" href={`/users/${r.target.id}`}>
                    {r.target.displayName}
                  </Link>
                </div>
                <span className="text-xs text-[var(--muted)]">{new Date(r.createdAt).toLocaleString("zh-HK")}</span>
              </div>
              <p className="mt-1 text-sm">
                {reportReasonLabel(r.reason.split("：")[0])}
                {r.reason.includes("：") ? ` · ${r.reason.slice(r.reason.indexOf("：") + 1)}` : ""}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                由{" "}
                <Link className="underline" href={`/users/${r.reporter.id}`}>
                  {r.reporter.displayName}
                </Link>{" "}
                提交 · {r.status === "DONE" ? "已處理" : "待處理"}
              </p>
              <div className="mt-3 flex gap-2">
                <Link className="btn-secondary px-3 py-1 text-xs" href={`/admin/users/${r.target.id}`}>
                  睇帳戶
                </Link>
                {r.status !== "DONE" && (
                  <button className="btn-primary px-3 py-1 text-xs" type="button" onClick={() => mark(r.id, "DONE")}>
                    標記已處理
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

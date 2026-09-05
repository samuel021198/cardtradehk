"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatHkPhone } from "@/lib/phone";
import { statusLabel } from "@/lib/constants";
import { MEMBERSHIP_TIERS, tierLabel } from "@/lib/tiers";

type AdminUser = {
  id: string;
  phone: string;
  displayName: string;
  role: string;
  status: string;
  canPost: boolean;
  canChat: boolean;
  canReview: boolean;
  canAuction: boolean;
  membershipTier: string;
  adminNote: string | null;
  createdAt: string;
  _count: { listings: number; reviewsReceived: number };
};

export function AdminUsers({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("USER");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return users;
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(needle) ||
        u.phone.includes(needle.replace(/\D/g, "")),
    );
  }, [users, q]);

  async function patch(id: string, body: Record<string, unknown>) {
    setError("");
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "更新失敗");
      return;
    }
    router.refresh();
  }

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, phone, password, role }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "新增失敗");
      return;
    }
    setDisplayName("");
    setPhone("");
    setPassword("");
    setRole("USER");
    router.refresh();
  }

  async function removeUser(id: string, name: string) {
    if (!confirm(`確定刪除「${name}」？帖文同對話都會一齊刪。`)) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "刪除失敗");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <form onSubmit={createUser} className="card grid gap-3 p-5 md:grid-cols-5">
        <h2 className="text-lg font-black md:col-span-5">新增用戶</h2>
        <input className="field" placeholder="顯示名稱" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        <input className="field" placeholder="電話 91234567" value={phone} onChange={(e) => setPhone(e.target.value)} required />
        <input className="field" type="password" placeholder="初始密碼" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        <select className="field" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="USER">一般用戶</option>
          <option value="ADMIN">管理員</option>
        </select>
        <button className="btn-primary" type="submit">
          開戶
        </button>
      </form>

      <div className="card overflow-x-auto p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black">用戶列表（{filtered.length}）</h2>
          <input className="field max-w-xs" placeholder="搜名稱或電話" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {error && <p className="mb-3 text-sm font-semibold text-red-600">{error}</p>}
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-[var(--muted)]">
            <tr>
              <th className="pb-2">用戶</th>
              <th className="pb-2">狀態</th>
              <th className="pb-2">功能</th>
              <th className="pb-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-[var(--line)]">
                <td className="py-3">
                  <Link className="font-black hover:text-[var(--accent)]" href={`/users/${u.id}`}>
                    {u.displayName}
                  </Link>
                  <div className="text-xs text-[var(--muted)]">
                    {formatHkPhone(u.phone)} · {u.role === "ADMIN" ? "管理員" : "用戶"} · {tierLabel(u.membershipTier)} · {u._count.listings} 帖
                  </div>
                  {u.adminNote && <div className="text-xs">備註：{u.adminNote}</div>}
                </td>
                <td className="py-3 font-semibold">{statusLabel(u.status)}</td>
                <td className="py-3">
                  <div className="mb-2">
                    <select
                      className="field py-1 text-xs"
                      value={u.membershipTier}
                      onChange={(e) => patch(u.id, { membershipTier: e.target.value })}
                    >
                      {MEMBERSHIP_TIERS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={`chip ${u.canPost ? "chip-on" : ""}`} onClick={() => patch(u.id, { canPost: !u.canPost })}>
                      放售
                    </button>
                    <button type="button" className={`chip ${u.canChat ? "chip-on" : ""}`} onClick={() => patch(u.id, { canChat: !u.canChat })}>
                      傾偈
                    </button>
                    <button type="button" className={`chip ${u.canReview ? "chip-on" : ""}`} onClick={() => patch(u.id, { canReview: !u.canReview })}>
                      評分
                    </button>
                    <button type="button" className={`chip ${u.canAuction ? "chip-on" : ""}`} onClick={() => patch(u.id, { canAuction: !u.canAuction })}>
                      拍賣
                    </button>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex flex-wrap gap-2">
                    {u.status !== "BLOCKED" && (
                      <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => patch(u.id, { status: "BLOCKED" })}>
                        封鎖
                      </button>
                    )}
                    {u.status !== "RESTRICTED" && (
                      <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => patch(u.id, { status: "RESTRICTED" })}>
                        限制
                      </button>
                    )}
                    {u.status !== "ACTIVE" && (
                      <button type="button" className="btn-secondary px-3 py-1 text-xs" onClick={() => patch(u.id, { status: "ACTIVE" })}>
                        解除
                      </button>
                    )}
                    <Link className="btn-secondary px-3 py-1 text-xs" href={`/admin/users/${u.id}`}>
                      詳情
                    </Link>
                    <button type="button" className="px-3 py-1 text-xs font-bold text-red-600" onClick={() => removeUser(u.id, u.displayName)}>
                      刪除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

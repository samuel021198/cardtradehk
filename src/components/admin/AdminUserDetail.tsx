"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatHkPhone } from "@/lib/phone";
import { MEMBERSHIP_TIERS } from "@/lib/tiers";

type Props = {
  user: {
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
    whatsapp: string | null;
  };
};

export function AdminUserDetail({ user }: Props) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [canPost, setCanPost] = useState(user.canPost);
  const [canChat, setCanChat] = useState(user.canChat);
  const [canReview, setCanReview] = useState(user.canReview);
  const [canAuction, setCanAuction] = useState(user.canAuction);
  const [membershipTier, setMembershipTier] = useState(user.membershipTier);
  const [adminNote, setAdminNote] = useState(user.adminNote ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName,
        role,
        status,
        canPost,
        canChat,
        canReview,
        canAuction,
        membershipTier,
        adminNote,
        ...(password ? { password } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "儲存失敗");
      return;
    }
    setPassword("");
    setOk("已儲存");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-xl space-y-4 p-6">
      <Link className="text-sm font-bold text-[var(--accent)]" href="/admin">
        ← 返用戶列表
      </Link>
      <h2 className="text-2xl font-black">{user.displayName}</h2>
      <p className="text-sm text-[var(--muted)]">登入電話：{formatHkPhone(user.phone)}</p>
      <label className="block space-y-1 text-sm font-semibold">
        顯示名稱
        <input className="field font-normal" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        會員級別
        <select className="field font-normal" value={membershipTier} onChange={(e) => setMembershipTier(e.target.value)}>
          {MEMBERSHIP_TIERS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        角色
        <select className="field font-normal" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="USER">一般用戶</option>
          <option value="ADMIN">管理員</option>
        </select>
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        帳戶狀態
        <select className="field font-normal" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="ACTIVE">正常</option>
          <option value="RESTRICTED">限制（可登入，功能由下面開關決定）</option>
          <option value="BLOCKED">封鎖（唔可以登入，帖文會喺市集隱藏）</option>
        </select>
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">功能開關</legend>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={canPost} onChange={(e) => setCanPost(e.target.checked)} />
          可以放售／改帖
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={canChat} onChange={(e) => setCanChat(e.target.checked)} />
          可以用站內傾偈
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={canReview} onChange={(e) => setCanReview(e.target.checked)} />
          可以評分
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={canAuction} onChange={(e) => setCanAuction(e.target.checked)} />
          可以開拍賣（最多一星期）
        </label>
      </fieldset>
      <label className="block space-y-1 text-sm font-semibold">
        管理員備註（只有後台見到）
        <textarea className="field min-h-24 font-normal" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        重設密碼（留空即唔改）
        <input className="field font-normal" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
      </label>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {ok && <p className="text-sm font-semibold text-emerald-700">{ok}</p>}
      <button className="btn-primary" type="submit">
        儲存
      </button>
    </form>
  );
}

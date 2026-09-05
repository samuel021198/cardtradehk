"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { whatsappLink } from "@/lib/phone";
import { UserAvatar } from "@/components/UserAvatar";

type Person = { id: string; displayName: string; whatsapp: string | null; avatarUrl: string | null };

export function AuctionWinnerPanel({
  auctionId,
  title,
  amountHkd,
  winner,
  runnerUp,
  tradeHref,
  winnerAcked,
  respondBy,
  abandoned,
  isSeller,
}: {
  auctionId: string;
  title: string;
  amountHkd: number;
  winner: Person;
  runnerUp?: Person | null;
  tradeHref?: string | null;
  winnerAcked: boolean;
  respondBy?: string | null;
  abandoned: boolean;
  isSeller: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState("");

  async function openChat(contactBidderId?: string) {
    setBusy(contactBidderId ?? "winner");
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ auctionId, contactBidderId }),
    });
    const data = await res.json();
    setBusy("");
    if (!res.ok) return;
    router.push(`/messages/${data.id}`);
  }

  const deadline = respondBy ? new Date(respondBy) : null;
  const overdue = Boolean(deadline && deadline.getTime() <= Date.now() && !winnerAcked);

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--chip)] p-4">
      <div className="text-sm font-bold text-[var(--accent)]">得標資料</div>
      <Link href={`/users/${winner.id}`} className="flex items-center gap-3">
        <UserAvatar name={winner.displayName} src={winner.avatarUrl} />
        <div>
          <div className="font-black">{winner.displayName}</div>
          <div className="text-sm text-[var(--muted)]">成交 HK${amountHkd}</div>
        </div>
      </Link>
      {abandoned ? (
        <p className="text-sm font-semibold text-red-500">此交易已視為棄單。你可以聯絡次高出價者。</p>
      ) : winnerAcked ? (
        <p className="text-sm font-semibold text-emerald-500">得標者已確認會跟進交收。</p>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          {overdue ? "已超過 48 小時尚未確認。" : "請得標者於 48 小時內前往「交易中」確認。"}
          {deadline ? ` 限期 ${deadline.toLocaleString("zh-HK")}` : ""}
        </p>
      )}
      <div className="grid gap-2">
        <button className="btn-primary w-full" type="button" disabled={Boolean(busy)} onClick={() => openChat()}>
          {busy === "winner" ? "開啟中…" : isSeller ? "聊天聯絡得標者" : "聊天聯絡賣家"}
        </button>
        {tradeHref && (
          <Link className="btn-secondary w-full text-center" href={tradeHref}>
            前往交易中跟進
          </Link>
        )}
        {isSeller && winner.whatsapp && (
          <a
            className="btn-secondary w-full text-center"
            href={whatsappLink(winner.whatsapp, `你好，關於拍賣「${title}」`)}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp 得標者
          </a>
        )}
      </div>
      {isSeller && runnerUp && (
        <div className="border-t border-[var(--line)] pt-3">
          <div className="text-sm font-bold">次高出價 · {runnerUp.displayName}</div>
          <p className="mb-2 text-xs text-[var(--muted)]">得標者棄單後，可改為聯絡此會員。</p>
          <button className="btn-secondary w-full" type="button" disabled={Boolean(busy)} onClick={() => openChat(runnerUp.id)}>
            {busy === runnerUp.id ? "開啟中…" : "聯絡次高出價者"}
          </button>
        </div>
      )}
    </div>
  );
}

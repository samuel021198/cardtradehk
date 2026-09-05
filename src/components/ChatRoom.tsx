"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatHkPhone, whatsappLink } from "@/lib/phone";
import { UserAvatar } from "@/components/UserAvatar";

type Message = {
  id: string;
  body: string;
  senderId: string;
  createdAt: string;
  sender: { id: string; displayName: string; avatarUrl?: string | null };
};

type ConversationPayload = {
  id: string;
  buyerId: string;
  sellerId: string;
  listing: {
    id: string;
    title: string;
    priceHkd: number;
    images: string[];
    seller: { id: string; displayName: string; whatsapp: string | null };
  } | null;
  auction: { id: string; title: string } | null;
  buyer: { id: string; displayName: string; whatsapp: string | null; avatarUrl?: string | null };
  seller: { id: string; displayName: string; whatsapp: string | null; avatarUrl?: string | null };
  messages: Message[];
  deal: {
    id: string;
    confirmedByBuyer: boolean;
    confirmedBySeller: boolean;
    completedAt: string | null;
    reviews: { fromUserId: string }[];
  } | null;
};

export function ChatRoom({ conversationId, meId }: { conversationId: string; meId: string }) {
  const [data, setData] = useState<ConversationPayload | null>(null);
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/conversations/${conversationId}`, { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }

  useEffect(() => {
    load();
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [conversationId]);

  const other = useMemo(() => {
    if (!data) return null;
    return data.buyerId === meId ? data.seller : data.buyer;
  }, [data, meId]);

  async function send(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    if (res.ok) {
      setText("");
      await load();
    }
  }

  async function confirmDeal() {
    const res = await fetch(`/api/conversations/${conversationId}/deal`, { method: "POST" });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error || "確認失敗");
      return;
    }
    await load();
  }

  async function submitReview() {
    if (!data?.deal) return;
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dealId: data.deal.id, rating, comment }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "評分失敗");
      return;
    }
    setComment("");
    await load();
  }

  if (!data || !other) return <p className="text-[var(--muted)]">載入對話…</p>;

  const topicTitle = data.listing?.title ?? data.auction?.title ?? "對話";
  const topicHref = data.listing ? `/listings/${data.listing.id}` : data.auction ? `/auctions/${data.auction.id}` : "/messages";
  const isAuctionChat = Boolean(data.auction && !data.listing);
  const isBuyer = data.buyerId === meId;
  const iConfirmed = isBuyer ? data.deal?.confirmedByBuyer : data.deal?.confirmedBySeller;
  const theyConfirmed = isBuyer ? data.deal?.confirmedBySeller : data.deal?.confirmedByBuyer;
  const completed = Boolean(data.deal?.completedAt);
  const iReviewed = data.deal?.reviews.some((r) => r.fromUserId === meId);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <section className="card flex min-h-[70vh] flex-col">
        <div className="border-b border-[var(--line)] p-4">
          <Link className="font-black hover:text-[var(--accent)]" href={topicHref}>
            {topicTitle}
          </Link>
          <div className="mt-1 flex items-center gap-2 text-sm text-[var(--muted)]">
            <UserAvatar name={other.displayName} src={other.avatarUrl} size="sm" />
            同 {other.displayName} 傾緊
          </div>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {data.messages.length === 0 && <p className="text-sm text-[var(--muted)]">未有訊息，打聲招呼啦。</p>}
          {data.messages.map((m) => {
            const mine = m.senderId === meId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-[var(--accent)] text-black" : "bg-[var(--chip)]"}`}>
                  <div className="mb-1 text-[10px] opacity-80">{m.sender.displayName}</div>
                  <MessageBody text={m.body} />
                </div>
              </div>
            );
          })}
        </div>
        <form onSubmit={send} className="flex gap-2 border-t border-[var(--line)] p-3">
          <input className="field flex-1" value={text} onChange={(e) => setText(e.target.value)} placeholder="輸入訊息…" />
          <button className="btn-primary" type="submit">
            傳送
          </button>
        </form>
      </section>
      <aside className="card space-y-4 p-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">聯絡</div>
          <div className="mt-2 flex items-center gap-2">
            <UserAvatar name={other.displayName} src={other.avatarUrl} />
            <div className="font-bold">{other.displayName}</div>
          </div>
          {other.whatsapp && (
            <a
              className="btn-secondary mt-3 w-full"
              href={whatsappLink(other.whatsapp, `你好，我想跟進「${topicTitle}」`)}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp {formatHkPhone(other.whatsapp)}
            </a>
          )}
        </div>
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">成交</div>
          {isAuctionChat ? (
            <p className="text-sm text-[var(--muted)]">呢個係拍賣得標對話。請跟賣家預設交收同付款方法傾妥。</p>
          ) : (
            <>
              <p className="text-sm text-[var(--muted)]">平台唔經手錢。線下交收後，雙方確認就可以互評。</p>
              {!completed && (
                <button className="btn-primary w-full" type="button" onClick={confirmDeal} disabled={Boolean(iConfirmed)}>
                  {iConfirmed ? "等對方確認" : "我確認已成交"}
                </button>
              )}
              {iConfirmed && !completed && (
                <p className="text-xs text-[var(--muted)]">{theyConfirmed ? "處理緊…" : "已記錄你嘅確認。"}</p>
              )}
              {completed && <p className="text-sm font-bold text-emerald-700">雙方已確認成交</p>}
            </>
          )}
        </div>
        {!isAuctionChat && completed && !iReviewed && (
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">評價對方</div>
            <select className="field" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} 星
                </option>
              ))}
            </select>
            <textarea className="field min-h-24" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="交易順暢嗎？卡況準嗎？" />
            <button className="btn-primary w-full" type="button" onClick={submitReview}>
              送出評分
            </button>
          </div>
        )}
        {!isAuctionChat && iReviewed && <p className="text-sm font-semibold">你已經評過呢單。</p>}
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      </aside>
    </div>
  );
}

function MessageBody({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s「」]+)/g);
  return (
    <div className="whitespace-pre-wrap break-words">
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a key={i} className="underline" href={part} target="_blank" rel="noreferrer">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </div>
  );
}

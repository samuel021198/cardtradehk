"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatHkPhone, whatsappLink } from "@/lib/phone";
import { UserAvatar } from "@/components/UserAvatar";
import { ReviewForm } from "@/components/ReviewForm";
import { TradeActions } from "@/components/TradeActions";

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
  trade: {
    id: string;
    status: string;
    source: string;
    sellerShippedAt: string | null;
    buyerReceivedAt: string | null;
    winnerAckAt: string | null;
    respondBy: string | null;
    reviews: { fromUserId: string }[];
  } | null;
};

export function ChatRoom({ conversationId, meId }: { conversationId: string; meId: string }) {
  const [data, setData] = useState<ConversationPayload | null>(null);
  const [text, setText] = useState("");
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

  if (!data || !other) return <p className="text-[var(--muted)]">載入對話…</p>;

  const topicTitle = data.listing?.title ?? data.auction?.title ?? "對話";
  const topicHref = data.listing ? `/listings/${data.listing.id}` : data.auction ? `/auctions/${data.auction.id}` : "/messages";
  const isBuyer = data.buyerId === meId;
  const trade = data.trade;
  const completed = trade?.status === "COMPLETED";
  const iReviewed = Boolean(trade?.reviews.some((r) => r.fromUserId === meId));

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
          <div className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">交易</div>
          {!trade && (
            <p className="text-sm text-[var(--muted)]">
              未開保留單。賣家保留或者雙方同意出價之後，會喺「交易中」跟進發貨同收貨。
            </p>
          )}
          {trade && trade.status !== "COMPLETED" && (
            <>
              <p className="text-sm text-[var(--muted)]">賣家先確認發貨，你收到之後買家先確認收貨。</p>
              <TradeActions
                tradeId={trade.id}
                isSeller={!isBuyer}
                isBuyer={isBuyer}
                sellerShipped={Boolean(trade.sellerShippedAt)}
                buyerReceived={Boolean(trade.buyerReceivedAt)}
                source={trade.source}
                winnerAcked={Boolean(trade.winnerAckAt)}
                respondBy={trade.respondBy}
              />
            </>
          )}
          {completed && <p className="text-sm font-bold text-emerald-500">交易已完成</p>}
          <Link className="inline-block text-sm underline" href="/trades">
            去交易中
          </Link>
        </div>
        {completed && trade && !iReviewed && <ReviewForm tradeId={trade.id} otherName={other.displayName} compact />}
        {completed && iReviewed && <p className="text-sm font-semibold">你已經評過呢單。</p>}
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

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { formatHkPhone } from "@/lib/phone";
import { UserAvatar } from "@/components/UserAvatar";

export function ProfileForm({
  displayName,
  bio,
  whatsapp,
  phone,
  deliveryNote,
  paymentNote,
  avatarUrl,
}: {
  displayName: string;
  bio: string;
  whatsapp: string;
  phone: string;
  deliveryNote: string;
  paymentNote: string;
  avatarUrl: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [avatar, setAvatar] = useState(avatarUrl);
  const [about, setAbout] = useState(bio);
  const [wa, setWa] = useState(whatsapp.replace(/^852/, ""));
  const [delivery, setDelivery] = useState(deliveryNote);
  const [payment, setPayment] = useState(paymentNote);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: name,
        bio: about,
        whatsapp: wa,
        deliveryNote: delivery,
        paymentNote: payment,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "儲存失敗");
      return;
    }
    setOk("已更新");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <h2 className="text-xl font-black">個人設定</h2>
      <p className="text-sm text-[var(--muted)]">登入電話：{formatHkPhone(phone)}（僅供登入，不會公開）</p>
      <div className="flex items-center gap-4">
        <UserAvatar name={name} src={avatar} size="lg" />
        <label className="file-btn">
          上載頭像
          <input
            className="file-input"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              const form = new FormData();
              form.append("file", file);
              const res = await fetch("/api/me/avatar", { method: "POST", body: form });
              const data = await res.json();
              if (!res.ok) {
                setError(data.error || "頭像上載失敗");
                return;
              }
              setAvatar(data.avatarUrl);
              setOk("頭像已更新");
              router.refresh();
            }}
          />
        </label>
      </div>
      <p className="text-xs text-[var(--muted)]">頭像會顯示於對話、商店及頂欄，方便其他會員識別。</p>
      <label className="block space-y-1 text-sm font-semibold">
        顯示名稱
        <input className="field font-normal" value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        公開 WhatsApp（可留空隱藏）
        <input className="field font-normal" value={wa} onChange={(e) => setWa(e.target.value)} placeholder="91234567" />
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        簡介
        <textarea className="field min-h-24 font-normal" value={about} onChange={(e) => setAbout(e.target.value)} />
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        預設交收方式
        <textarea
          className="field min-h-20 font-normal"
          value={delivery}
          onChange={(e) => setDelivery(e.target.value)}
          placeholder="例如：旺角交收／順豐到付"
        />
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        預設付款方法
        <textarea
          className="field min-h-20 font-normal"
          value={payment}
          onChange={(e) => setPayment(e.target.value)}
          placeholder="例如：PayMe／轉數快／現金"
        />
      </label>
      <p className="text-xs text-[var(--muted)]">拍賣完結後聯絡得標者時，以上兩段會自動成為第二則訊息。</p>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      {ok && <p className="text-sm font-semibold text-emerald-700">{ok}</p>}
      <button className="btn-primary" type="submit">
        儲存
      </button>
    </form>
  );
}

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CARD_TYPES, GAMES, MAX_BATCH_POST, MAX_LISTING_IMAGES, cardTypeDetailLabel, gradesFor } from "@/lib/constants";

type ListingFormProps = {
  mode: "create" | "edit";
  listingId?: string;
  initial?: {
    title: string;
    game: string;
    cardType: string;
    condition: string;
    priceHkd: number;
    description: string;
    images: string[];
    status: string;
  };
};

export function ListingForm({ mode, listingId, initial }: ListingFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [game, setGame] = useState(initial?.game ?? "POKEMON");
  const [cardType, setCardType] = useState(initial?.cardType ?? "RAW");
  const [condition, setCondition] = useState(initial?.condition ?? "A");
  const [priceHkd, setPriceHkd] = useState(String(initial?.priceHkd ?? ""));
  const [description, setDescription] = useState(initial?.description ?? "");
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [status, setStatus] = useState(initial?.status ?? "ACTIVE");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [queue, setQueue] = useState<
    { title: string; game: string; cardType: string; condition: string; priceHkd: number; description: string; images: string[] }[]
  >([]);

  const grades = gradesFor(cardType);

  function changeCardType(next: string) {
    setCardType(next);
    const options = gradesFor(next);
    if (!options.some((g) => g.value === condition)) {
      setCondition(options[0].value);
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const form = new FormData();
    Array.from(files)
      .slice(0, MAX_LISTING_IMAGES - images.length)
      .forEach((f) => form.append("files", f));
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "上傳失敗");
    setImages((prev) => [...prev, ...data.urls].slice(0, MAX_LISTING_IMAGES));
  }

  function currentDraft() {
    return {
      title,
      game,
      cardType,
      condition,
      priceHkd: Number(priceHkd),
      description,
      images,
    };
  }

  function addToQueue() {
    setError("");
    if (queue.length >= MAX_BATCH_POST) {
      setError(`一次最多發佈 ${MAX_BATCH_POST} 件`);
      return;
    }
    const draft = currentDraft();
    if (draft.title.trim().length < 2 || !Number.isInteger(draft.priceHkd) || draft.priceHkd < 1) {
      setError("請先填寫標題及價錢，再加入清單");
      return;
    }
    setQueue((prev) => [...prev, draft]);
    setTitle("");
    setPriceHkd("");
    setDescription("");
    setImages([]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      if (mode === "edit") {
        const res = await fetch(`/api/listings/${listingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...currentDraft(), status }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "儲存失敗");
        router.push(`/listings/${data.id ?? listingId}`);
        router.refresh();
        return;
      }
      const items = queue.length > 0 ? [...queue, ...(title.trim() ? [currentDraft()] : [])] : [currentDraft()];
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(items.length === 1 ? items[0] : { items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "儲存失敗");
      router.push(items.length === 1 ? `/listings/${data.id}` : "/selling");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-2xl font-black">{mode === "create" ? "放售卡牌" : "編輯商品"}</h1>
      {mode === "create" && (
        <p className="text-sm text-[var(--muted)]">可一次加入最多 {MAX_BATCH_POST} 件。填妥一件後點選「加入清單」，再繼續下一件。</p>
      )}
      <label className="block space-y-1 text-sm font-semibold">
        標題
        <input className="field font-normal" value={title} onChange={(e) => setTitle(e.target.value)} required />
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        種類
        <select className="field font-normal" value={game} onChange={(e) => setGame(e.target.value)}>
          {GAMES.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">鑑定卡／Raw卡／未開封產品</legend>
        <div className="flex flex-wrap gap-2">
          {CARD_TYPES.map((type) => (
            <button
              key={type.value}
              type="button"
              className={`chip ${cardType === type.value ? "chip-on" : ""}`}
              onClick={() => changeCardType(type.value)}
            >
              {type.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block space-y-1 text-sm font-semibold">
        {cardTypeDetailLabel(cardType)}
        <select className="field font-normal" value={condition} onChange={(e) => setCondition(e.target.value)}>
          {grades.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        價錢（HK$）
        <input
          className="field font-normal"
          type="number"
          min={1}
          value={priceHkd}
          onChange={(e) => setPriceHkd(e.target.value)}
          required
        />
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        詳情
        <textarea className="field min-h-32 font-normal" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {mode === "edit" && (
        <label className="block space-y-1 text-sm font-semibold">
          狀態
          <select className="field font-normal" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="ACTIVE">放售中</option>
            <option value="HIDDEN">隱藏</option>
            <option value="SOLD">已售</option>
          </select>
        </label>
      )}
      <div className="space-y-3">
        <div className="text-sm font-semibold">相片（最多 {MAX_LISTING_IMAGES} 張）</div>
        <label className="file-btn">
          選擇相片
          <input
            className="file-input"
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              upload(e.target.files).catch((err) => setError(err.message));
              e.target.value = "";
            }}
          />
        </label>
        <p className="text-xs text-[var(--muted)]">
          已選 {images.length}/{MAX_LISTING_IMAGES} 張。點選縮圖即可移除。
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {images.map((src) => (
            <button
              key={src}
              type="button"
              className="overflow-hidden rounded-xl border border-[var(--line)]"
              onClick={() => setImages((prev) => prev.filter((x) => x !== src))}
              title="點選移除"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      </div>
      {mode === "create" && queue.length > 0 && (
        <ul className="space-y-1 text-sm">
          {queue.map((item, i) => (
            <li key={`${item.title}-${i}`} className="flex items-center justify-between rounded-xl bg-[var(--chip)] px-3 py-2">
              <span>
                {i + 1}. {item.title} · HK${item.priceHkd}
              </span>
              <button type="button" className="text-xs underline" onClick={() => setQueue((prev) => prev.filter((_, idx) => idx !== i))}>
                移除
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {mode === "create" && (
          <button className="btn-secondary" type="button" disabled={pending} onClick={addToQueue}>
            加入清單（繼續下一件）
          </button>
        )}
        <button className="btn-primary" disabled={pending} type="submit">
          {pending ? "儲存中…" : mode === "create" && queue.length > 0 ? `一次發佈 ${queue.length + (title.trim() ? 1 : 0)} 件` : "發佈"}
        </button>
      </div>
    </form>
  );
}

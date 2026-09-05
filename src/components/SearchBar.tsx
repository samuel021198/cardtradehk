"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GAMES } from "@/lib/constants";
import { clearSearchHistory, forgetSearch, readSearchHistory, rememberSearch } from "@/lib/search-history";

export function SearchBar({ basePath = "/" }: { basePath?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const boxRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const game = params.get("game") ?? "";
  const type = params.get("type") ?? "";

  useEffect(() => {
    const term = params.get("q") ?? "";
    setQ(term);
    if (term.trim().length >= 2) setHistory(rememberSearch(term));
  }, [params]);

  useEffect(() => {
    setHistory(readSearchHistory());
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function apply(nextGame = game, nextQ = q, save = true) {
    const term = nextQ.trim();
    if (save && term.length >= 2) setHistory(rememberSearch(term));
    const search = new URLSearchParams();
    if (term) search.set("q", term);
    if (nextGame) search.set("game", nextGame);
    if (type) search.set("type", type);
    const qs = search.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
    setOpen(false);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    apply();
  }

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const current = params.get("q") ?? "";
      if (q.trim() === current) return;
      if (q.trim().length === 0 && !current) return;
      if (q.trim().length > 0 && q.trim().length < 2) return;
      apply(game, q);
    }, 380);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const shown = history.filter((item) => !q.trim() || item.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="flex gap-2">
        <div className="relative flex-1" ref={boxRef}>
          <input
            className="field w-full"
            placeholder="搜尋卡名、賣家、PSA、海賊王、100-500…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => {
              setHistory(readSearchHistory());
              setOpen(true);
            }}
            enterKeyHint="search"
            autoComplete="off"
          />
          {open && shown.length > 0 && (
            <div className="absolute left-0 right-0 z-30 mt-1 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-lg">
              <div className="flex items-center justify-between px-3 py-2 text-xs font-bold text-[var(--muted)]">
                <span>最近搜尋</span>
                <button
                  type="button"
                  className="text-[var(--accent)]"
                  onClick={() => {
                    setHistory(clearSearchHistory());
                    setOpen(false);
                  }}
                >
                  清除
                </button>
              </div>
              {shown.map((item) => (
                <div key={item} className="flex items-center hover:bg-[var(--chip)]">
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm font-semibold"
                    onClick={() => {
                      setQ(item);
                      apply(game, item);
                    }}
                  >
                    {item}
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 text-xs text-[var(--muted)]"
                    aria-label={`刪除 ${item}`}
                    onClick={() => setHistory(forgetSearch(item))}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button className="btn-primary shrink-0 px-4" type="submit">
          <span className="md:hidden">搜</span>
          <span className="hidden md:inline">搜尋</span>
        </button>
      </form>
      {history.length > 0 && (
        <div className="chip-row md:flex-wrap md:overflow-visible">
          <span className="self-center text-xs font-bold text-[var(--muted)]">最近</span>
          {history.slice(0, 6).map((item) => (
            <button
              key={item}
              type="button"
              className={`chip ${q.trim() === item ? "chip-on" : ""}`}
              onClick={() => {
                setQ(item);
                apply(game, item);
              }}
            >
              {item}
            </button>
          ))}
          <button type="button" className="text-xs font-bold text-[var(--muted)]" onClick={() => setHistory(clearSearchHistory())}>
            清除紀錄
          </button>
        </div>
      )}
      <div className="chip-row md:flex-wrap md:overflow-visible">
        <button type="button" className={`chip ${!game ? "chip-on" : ""}`} onClick={() => apply("", q, false)}>
          全部種類
        </button>
        {GAMES.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`chip ${game === item.value ? "chip-on" : ""}`}
            onClick={() => apply(item.value, q, false)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

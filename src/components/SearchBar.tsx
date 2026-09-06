"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GAMES } from "@/lib/constants";
import { CATALOG_SORTS, catalogHref, parseCatalogSort } from "@/lib/catalog-sort";
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
  const sort = parseCatalogSort(params.get("sort"));
  const view = params.get("view") === "listings" ? "listings" : "";

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

  function apply(next: { game?: string; q?: string; sort?: string; view?: string; save?: boolean } = {}) {
    const nextGame = next.game ?? game;
    const nextQ = next.q ?? q;
    const nextSort = parseCatalogSort(next.sort ?? sort);
    const nextView = next.view !== undefined ? next.view : view;
    const term = nextQ.trim();
    if ((next.save ?? true) && term.length >= 2) setHistory(rememberSearch(term));
    router.push(
      catalogHref(basePath, {
        q: term,
        game: nextGame,
        type,
        sort: nextGame ? nextSort : undefined,
        view: basePath === "/" ? nextView : undefined,
      }),
    );
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
      apply({ q });
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
                      apply({ q: item });
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
                apply({ q: item });
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
        <button type="button" className={`chip ${!game ? "chip-on" : ""}`} onClick={() => apply({ game: "", sort: "newest", view: "", save: false })}>
          全部種類
        </button>
        {GAMES.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`chip ${game === item.value ? "chip-on" : ""}`}
            onClick={() => apply({ game: item.value, save: false })}
          >
            {item.label}
          </button>
        ))}
      </div>
      {game && (
        <div className="chip-row md:flex-wrap md:overflow-visible">
          <span className="self-center text-xs font-bold text-[var(--muted)]">排列</span>
          {CATALOG_SORTS.filter((item) => item.value !== "ending" || basePath !== "/" || view !== "listings").map((item) => (
            <button
              key={item.value}
              type="button"
              className={`chip ${sort === item.value ? "chip-on" : ""}`}
              onClick={() => apply({ sort: item.value, save: false })}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

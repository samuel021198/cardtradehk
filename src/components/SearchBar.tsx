"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { GAMES } from "@/lib/constants";

export function SearchBar({ basePath = "/" }: { basePath?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const game = params.get("game") ?? "";
  const type = params.get("type") ?? "";

  function apply(nextGame = game, nextQ = q) {
    const search = new URLSearchParams();
    if (nextQ.trim()) search.set("q", nextQ.trim());
    if (nextGame) search.set("game", nextGame);
    if (type) search.set("type", type);
    const qs = search.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    apply();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          className="field flex-1"
          placeholder="搜卡名、系列、關鍵字…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn-primary" type="submit">
          搜尋
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`chip ${!game ? "chip-on" : ""}`} onClick={() => apply("")}>
          全部種類
        </button>
        {GAMES.map((item) => (
          <button
            key={item.value}
            type="button"
            className={`chip ${game === item.value ? "chip-on" : ""}`}
            onClick={() => apply(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

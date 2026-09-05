"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function TradeSearch() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    const qs = next.toString();
    router.push(qs ? `/trades?${qs}` : "/trades");
  }

  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <input
        className="field flex-1"
        placeholder="搜尋商品名稱、對方名稱…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <button className="btn-primary" type="submit">
        搜尋
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function SellMenu({ canPost }: { canPost: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="rounded-full px-3 py-2 hover:bg-[var(--chip)]"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        放售
        <span className="ml-1 text-[var(--muted)]">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-44 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-1 shadow-lg">
          {canPost && (
            <Link href="/listings/new" className="block px-4 py-2 text-sm hover:bg-[var(--chip)]" onClick={() => setOpen(false)}>
              放售商品
            </Link>
          )}
          <Link href="/selling" className="block px-4 py-2 text-sm hover:bg-[var(--chip)]" onClick={() => setOpen(false)}>
            我的商品
          </Link>
          <Link
            href="/trades?role=sell"
            className="block border-t border-[var(--line)] px-4 py-2 text-sm hover:bg-[var(--chip)]"
            onClick={() => setOpen(false)}
          >
            交易中
          </Link>
        </div>
      )}
    </div>
  );
}

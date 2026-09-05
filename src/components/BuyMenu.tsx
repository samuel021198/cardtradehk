"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BUY_SECTIONS } from "@/lib/buy";

export function BuyMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const params = useSearchParams();
  const type = pathname === "/" ? (params.get("type") ?? "") : "";

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
        買野
        <span className="ml-1 text-[var(--muted)]">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-40 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-1 shadow-lg">
          {BUY_SECTIONS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`block px-4 py-2 text-sm hover:bg-[var(--chip)] ${type === item.type ? "font-black text-[var(--accent)]" : ""}`}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

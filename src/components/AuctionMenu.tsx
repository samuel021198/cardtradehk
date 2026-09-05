"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AUCTION_SECTIONS } from "@/lib/buy";

export function AuctionMenu({ canCreate }: { canCreate: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const params = useSearchParams();
  const onAuction = pathname.startsWith("/auctions");
  const type = onAuction ? (params.get("type") ?? "") : "";

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
        拍賣
        <span className="ml-1 text-[var(--muted)]">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-44 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-1 shadow-lg">
          {AUCTION_SECTIONS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`block px-4 py-2 text-sm hover:bg-[var(--chip)] ${onAuction && pathname === "/auctions" && type === item.type ? "font-black text-[var(--accent)]" : ""}`}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          {canCreate && (
            <Link
              href="/auctions/new"
              className="block border-t border-[var(--line)] px-4 py-2 text-sm font-bold text-[var(--accent)] hover:bg-[var(--chip)]"
              onClick={() => setOpen(false)}
            >
              開拍
            </Link>
          )}
          <Link
            href="/trades?source=auction"
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

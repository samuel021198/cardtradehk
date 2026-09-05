"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { UserAvatar } from "@/components/UserAvatar";

const ITEMS = [
  { href: "/selling", label: "我的商品" },
  { href: "/me", label: "個人設定" },
];

export function AccountMenu({ name, avatarUrl, userId }: { name: string; avatarUrl?: string | null; userId?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

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
        <span className="flex items-center gap-2">
          <UserAvatar name={name} src={avatarUrl} size="sm" />
          {name}
          <span className="text-[var(--muted)]">▾</span>
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-40 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-1 shadow-lg">
          {userId && (
            <Link
              href={`/users/${userId}`}
              className={`block px-4 py-2 text-sm hover:bg-[var(--chip)] ${pathname.startsWith("/users/") ? "font-black text-[var(--accent)]" : ""}`}
              onClick={() => setOpen(false)}
            >
              我的帳戶
            </Link>
          )}
          {ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2 text-sm hover:bg-[var(--chip)] ${pathname === item.href || pathname.startsWith(`${item.href}?`) ? "font-black text-[var(--accent)]" : ""}`}
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

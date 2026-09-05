"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import { UserAvatar } from "@/components/UserAvatar";

export function AccountMenu({
  name,
  avatarUrl,
  userId,
  isAdmin = false,
}: {
  name: string;
  avatarUrl?: string | null;
  userId?: string;
  isAdmin?: boolean;
}) {
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

  const items = [
    userId ? { href: `/users/${userId}`, label: "我的帳戶" } : null,
    { href: "/favorites", label: "我的收藏" },
    { href: "/trades", label: "交易中" },
    { href: "/selling", label: "我的商品" },
    { href: "/me", label: "個人設定" },
    isAdmin ? { href: "/admin", label: "後台" } : null,
  ].filter(Boolean) as { href: string; label: string }[];

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
          <span className="hidden sm:inline">{name}</span>
          <span className="text-[var(--muted)]">▾</span>
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 min-w-44 overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] py-1 shadow-lg">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`block px-4 py-2 text-sm hover:bg-[var(--chip)] ${pathname === item.href || pathname.startsWith(`${item.href}?`) ? "font-black text-[var(--accent)]" : ""}`}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            className="block w-full border-t border-[var(--line)] px-4 py-2 text-left text-sm text-[var(--muted)] hover:bg-[var(--chip)]"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            登出
          </button>
        </div>
      )}
    </div>
  );
}

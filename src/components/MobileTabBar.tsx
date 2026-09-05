"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavBadge } from "@/components/NavBadge";

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
    </svg>
  );
}
function IconGavel() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m14 4 6 6M3 21l7-7M8.5 7.5l8 8M5 11l3-3 8 8-3 3z" />
    </svg>
  );
}
function IconTag() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3h8v8l-9.5 9.5a3 3 0 0 1-4.2 0L3.5 17.7a3 3 0 0 1 0-4.2z" />
      <circle cx="16" cy="8" r="1.2" fill="currentColor" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M5 6h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H9l-4 4v-4H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
    </svg>
  );
}
function IconMe() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 19c1.4-3.2 4-5 7-5s5.6 1.8 7 5" />
    </svg>
  );
}

export function MobileTabBar({ inbox = 0, loggedIn = false }: { inbox?: number; loggedIn?: boolean }) {
  const pathname = usePathname();
  const tabs = [
    { href: "/", label: "消費", icon: <IconHome />, on: pathname === "/" },
    { href: "/auctions", label: "拍賣", icon: <IconGavel />, on: pathname.startsWith("/auctions") },
    {
      href: loggedIn ? "/selling" : "/login?callbackUrl=/selling",
      label: "放售",
      icon: <IconTag />,
      on: pathname.startsWith("/selling") || pathname.startsWith("/listings/new"),
    },
    {
      href: loggedIn ? "/messages" : "/login?callbackUrl=/messages",
      label: "訊息",
      icon: <IconChat />,
      on: pathname.startsWith("/messages"),
      badge: loggedIn ? inbox : 0,
    },
    {
      href: loggedIn ? "/account" : "/login?callbackUrl=/account",
      label: "我",
      icon: <IconMe />,
      on:
        pathname.startsWith("/account") ||
        pathname.startsWith("/me") ||
        pathname.startsWith("/favorites") ||
        pathname.startsWith("/trades") ||
        pathname.startsWith("/users/"),
    },
  ];

  return (
    <nav className="mobile-tabbar flex md:hidden">
      {tabs.map((tab) => (
        <Link
          key={tab.label}
          href={tab.href}
          className={`relative flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${
            tab.on ? "text-[var(--accent)]" : "text-[var(--muted)]"
          }`}
        >
          {tab.icon}
          {tab.label}
          {tab.badge ? <NavBadge count={tab.badge} /> : null}
        </Link>
      ))}
    </nav>
  );
}

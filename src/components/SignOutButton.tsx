"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 text-left text-base font-bold text-[var(--muted)]"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      登出
    </button>
  );
}

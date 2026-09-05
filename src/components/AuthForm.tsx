"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      if (mode === "register") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, password, displayName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "註冊失敗");
      }

      const result = await signIn("credentials", {
        phone,
        password,
        redirect: false,
      });
      if (result?.error) throw new Error("電話或密碼不正確");
      router.push(params.get("callbackUrl") || "/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "出咗錯");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-md space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-black">{mode === "login" ? "登入" : "開戶"}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {mode === "login" ? "可用帳戶名稱（例如 try01）或香港電話 + 密碼。" : "用香港手機號碼 + 密碼開戶。本機唔使驗證 SMS。"}
        </p>
      </div>
      {mode === "register" && (
        <label className="block space-y-1 text-sm font-semibold">
          顯示名稱
          <input className="field font-normal" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </label>
      )}
      <label className="block space-y-1 text-sm font-semibold">
        {mode === "login" ? "帳戶名稱／電話" : "電話號碼"}
        <input
          className="field font-normal"
          inputMode={mode === "login" ? "text" : "numeric"}
          placeholder={mode === "login" ? "Admin01 / try01 / 91234567" : "91234567"}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        密碼
        <input
          className="field font-normal"
          type="password"
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={pending} type="submit">
        {pending ? "處理緊…" : mode === "login" ? "登入" : "開戶並登入"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        {mode === "login" ? (
          <>
            未有戶口？{" "}
            <Link className="font-bold text-[var(--accent)]" href="/register">
              開戶
            </Link>
          </>
        ) : (
          <>
            已經有戶口？{" "}
            <Link className="font-bold text-[var(--accent)]" href="/login">
              登入
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

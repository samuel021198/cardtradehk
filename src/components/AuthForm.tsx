"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "register" && password !== passwordConfirm) {
      setError("兩次輸入的密碼不一致");
      return;
    }
    setPending(true);
    try {
      if (mode === "register") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone, email, password, passwordConfirm, displayName }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "註冊失敗");
        sessionStorage.setItem(
          "signupVerify",
          JSON.stringify({ phone: data.phone ?? phone, email: data.email ?? email, devCode: data.devCode }),
        );
        sessionStorage.setItem("signupPassword", password);
        const next = new URLSearchParams();
        next.set("phone", data.phone ?? phone);
        next.set("email", data.email ?? email);
        const callback = params.get("callbackUrl");
        if (callback) next.set("callbackUrl", callback);
        router.push(`/register/verify?${next.toString()}`);
        return;
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
      setError(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-md space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-black">{mode === "login" ? "登入" : "申請帳戶"}</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {mode === "login"
            ? "可使用帳戶名稱（例如 try01）或香港電話及密碼登入。"
            : "請填寫電郵、香港手機號碼及密碼。每個電話號碼只可開戶一次，並須完成電郵認證。"}
        </p>
      </div>
      {mode === "register" && (
        <>
          <label className="block space-y-1 text-sm font-semibold">
            顯示名稱
            <input className="field font-normal" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </label>
          <label className="block space-y-1 text-sm font-semibold">
            電郵
            <input
              className="field font-normal"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>
        </>
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
        {mode === "register" && <span className="block font-normal text-xs text-[var(--muted)]">每個香港手機號碼只可申請一次。</span>}
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
      {mode === "register" && (
        <label className="block space-y-1 text-sm font-semibold">
          確認密碼
          <input
            className="field font-normal"
            type="password"
            minLength={6}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
          />
        </label>
      )}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={pending} type="submit">
        {pending ? "處理中…" : mode === "login" ? "登入" : "發送驗證碼"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        {mode === "login" ? (
          <>
            尚未有帳戶？{" "}
            <Link className="font-bold text-[var(--accent)]" href="/register">
              申請帳戶
            </Link>
          </>
        ) : (
          <>
            已經有帳戶？{" "}
            <Link className="font-bold text-[var(--accent)]" href="/login">
              登入
            </Link>
          </>
        )}
      </p>
    </form>
  );
}

"use client";

import { FormEvent, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export function VerifyEmailForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [phone, setPhone] = useState(params.get("phone") ?? "");
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("signupVerify");
      if (!raw) return;
      const saved = JSON.parse(raw) as { phone?: string; email?: string; devCode?: string };
      if (!phone && saved.phone) setPhone(saved.phone);
      if (!email && saved.email) setEmail(saved.email);
      if (saved.devCode) setHint(`本機開發驗證碼：${saved.devCode}`);
    } catch {
      /* ignore */
    }
  }, [email, phone]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const res = await fetch("/api/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email, code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "認證失敗");

      const password = sessionStorage.getItem("signupPassword") ?? "";
      sessionStorage.removeItem("signupVerify");
      sessionStorage.removeItem("signupPassword");

      if (password) {
        const result = await signIn("credentials", { phone: data.phone ?? phone, password, redirect: false });
        if (result?.error) throw new Error("帳戶已建立，請使用電話及密碼登入。");
        router.push(params.get("callbackUrl") || "/");
        router.refresh();
        return;
      }
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setError("");
    setResending(true);
    try {
      const res = await fetch("/api/register/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "無法重發");
      setHint(data.devCode ? `本機開發驗證碼：${data.devCode}` : "已再次發送驗證碼，請查閱電郵。");
    } catch (err) {
      setError(err instanceof Error ? err.message : "發生錯誤");
    } finally {
      setResending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card mx-auto max-w-md space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-black">電郵認證</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">請輸入發送到你電郵的 6 位驗證碼，以完成開戶。</p>
      </div>
      <label className="block space-y-1 text-sm font-semibold">
        電郵
        <input className="field font-normal" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        電話號碼
        <input className="field font-normal" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </label>
      <label className="block space-y-1 text-sm font-semibold">
        驗證碼
        <input
          className="field font-normal tracking-[0.3em]"
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          required
        />
      </label>
      {hint && <p className="text-sm font-semibold text-[var(--accent)]">{hint}</p>}
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button className="btn-primary w-full" disabled={pending} type="submit">
        {pending ? "認證中…" : "完成認證並登入"}
      </button>
      <button className="btn-secondary w-full" disabled={resending} type="button" onClick={resend}>
        {resending ? "發送中…" : "重發驗證碼"}
      </button>
      <p className="text-center text-sm text-[var(--muted)]">
        <Link className="font-bold text-[var(--accent)]" href="/register">
          返回開戶
        </Link>
      </p>
    </form>
  );
}

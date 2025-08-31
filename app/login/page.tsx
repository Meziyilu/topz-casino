// app/login/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-white">載入中…</div>}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 已有 token 直接跳
  useEffect(() => {
    const t =
      typeof window !== "undefined" &&
      (localStorage.getItem("token") ||
        localStorage.getItem("jwt") ||
        localStorage.getItem("access_token"));
    if (t) router.replace("/lobby");
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        setErr(j?.error || r.statusText || "登入失敗");
        return;
      }
      // 先嘗試從 body 取 token
      const token = j?.token || j?.accessToken || j?.jwt || j?.data?.token;
      if (token) {
        localStorage.setItem("token", token);
        localStorage.setItem("jwt", token);
        localStorage.setItem("access_token", token);
        router.replace(search.get("next") || "/lobby");
        return;
      }
      // 沒拿到 token，用 Cookie 檢查是否已登入
      const me = await fetch("/api/auth/me", { cache: "no-store" }).then(x => x.json()).catch(() => null);
      if (me?.ok) {
        router.replace(search.get("next") || "/lobby");
        return;
      }
      setErr("未取得登入憑證（token）。");
    } catch {
      setErr("網路或伺服器錯誤");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b0f1a] via-black to-[#0b0f1a]" />
      <div className="absolute -top-32 -left-20 w-[60vw] h-[60vw] rounded-full bg-indigo-600/20 blur-[120px]" />
      <div className="absolute -bottom-32 -right-20 w-[55vw] h-[55vw] rounded-full bg-fuchsia-600/20 blur-[120px]" />

      <div className="relative z-10 flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl">
          <header className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-inner" />
              <h1 className="text-2xl font-extrabold tracking-wide">登入 TopzCasino</h1>
            </div>
            <p className="text-sm opacity-70">請輸入 Email 與密碼</p>
          </header>

          <form onSubmit={onSubmit} className="space-y-4">
            <input
              type="email"
              className="w-full p-3 rounded-xl border border-white/10 bg-white/5 outline-none"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
            <input
              type="password"
              className="w-full p-3 rounded-xl border border-white/10 bg-white/5 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />

            {err && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm">{err}</div>}

            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-2xl text-white bg-gradient-to-r from-indigo-500 via-blue-500 to-fuchsia-500 disabled:opacity-50 shadow-lg"
            >
              {busy ? "登入中…" : "登入"}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between text-sm opacity-90">
            <Link href="/register" className="hover:underline">立即註冊</Link>
            <Link href="/forgot-password" className="hover:underline">忘記密碼？</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

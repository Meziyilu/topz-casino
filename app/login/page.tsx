// app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 已有 token 就直接跳走
  useEffect(() => {
    const t =
      typeof window !== "undefined" &&
      (localStorage.getItem("token") ||
        localStorage.getItem("jwt") ||
        localStorage.getItem("access_token"));
    if (t) {
      router.replace("/lobby");
    }
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
      const token =
        j?.token || j?.accessToken || j?.data?.token || j?.data?.accessToken;
      if (!token) {
        setErr("未取得登入憑證（token）");
        return;
      }
      // 存進 localStorage（多個 key 以相容現有程式）
      localStorage.setItem("token", token);
      localStorage.setItem("jwt", token);
      localStorage.setItem("access_token", token);

      // 依 next 參數或預設跳轉
      const next = search.get("next") || "/lobby";
      router.replace(next);
    } catch (e: any) {
      setErr("網路或伺服器錯誤");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <div className="w-full max-w-md p-6 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md shadow-xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">登入 TopzCasino</h1>
          <p className="text-sm opacity-70">請輸入 Email 與密碼</p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm opacity-80 mb-1">Email</label>
            <input
              type="email"
              className="w-full p-3 rounded-lg border border-white/10 bg-white/5 outline-none"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm opacity-80 mb-1">密碼</label>
            <input
              type="password"
              className="w-full p-3 rounded-lg border border-white/10 bg-white/5 outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {err && (
            <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm">
              {err}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full py-3 rounded-xl text-white bg-gradient-to-r from-blue-500 to-indigo-600 disabled:opacity-50"
          >
            {busy ? "登入中…" : "登入"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm opacity-80">
          <Link
            href="/"
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
          >
            ← 回首頁
          </Link>
          <Link
            href="/lobby"
            className="px-3 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition"
          >
            先逛逛大廳
          </Link>
        </div>
      </div>
    </div>
  );
}

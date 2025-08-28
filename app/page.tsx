"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "登入失敗");
      setMsg("登入成功，帶您進入大廳…");
      router.replace("/casino");
    } catch (err: any) {
      setMsg(err?.message || "登入失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden grid place-items-center p-6">
      {/* 漸層光暈背景 */}
      <div className="pointer-events-none absolute -z-10 inset-0">
        <div className="absolute -top-24 -left-24 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-25"
             style={{background:"radial-gradient(closest-side,#5674ff,transparent)"}} />
        <div className="absolute -bottom-24 -right-24 w-[32rem] h-[32rem] rounded-full blur-3xl opacity-25"
             style={{background:"radial-gradient(closest-side,#22c55e,transparent)"}} />
      </div>

      <div className="glass neon w-full max-w-md rounded-2xl p-7 shadow-glass animate-[fadeIn_0.5s_ease]">
        {/* LOGO / Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-brand-500 animate-pulse" />
            <span className="h-2 w-2 rounded-full bg-brand-400 animate-pulse [animation-delay:.2s]" />
            <span className="h-2 w-2 rounded-full bg-brand-300 animate-pulse [animation-delay:.4s]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-[.25em]">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-brand-200 to-brand-500">
              TOPZCASINO
            </span>
          </h1>
          <p className="text-sm opacity-70 mt-2">歡迎回來，祝您好手氣 🎲</p>
        </div>

        {/* 表單 */}
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm opacity-80">電子信箱</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/15 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm opacity-80">密碼</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/15 focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn w-full rounded-lg ${loading ? "opacity-70 cursor-not-allowed shimmer" : ""}`}
          >
            {loading ? "登入中…" : "登入"}
          </button>
        </form>

        {/* 訊息 */}
        {msg && (
          <div className="mt-4 text-center text-sm opacity-90">
            {msg}
          </div>
        )}

        {/* 連到大廳（測試快速進入） */}
        <div className="mt-6 text-center text-xs opacity-70">
          只是看看？<a href="/casino" className="underline hover:opacity-100">進入大廳</a>
        </div>
      </div>
    </div>
  );
}

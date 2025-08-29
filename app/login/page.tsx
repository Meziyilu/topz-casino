// app/login/page.tsx
export const dynamic = "force-dynamic";
export const revalidate = 0;

"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  // 已登入者直接進大廳
  useEffect(() => {
    (async () => {
      try {
        const me = await fetch("/api/auth/me", { cache: "no-store" }).then(r => r.ok ? r.json() : null);
        if (me?.id) router.replace("/lobby");
      } catch {}
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "登入失敗");
      }
      router.push("/lobby");
    } catch (e: any) {
      setErrMsg(e?.message || "登入失敗");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh relative overflow-hidden bg-gradient-to-br from-slate-900 via-zinc-900 to-black">
      {/* 背景微粒子 */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-16 -right-20 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl animate-pulse"></div>
      </div>

      {/* LOGO / 品牌 */}
      <div className="absolute top-8 w-full text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-200 to-yellow-400 drop-shadow">
          TOPZCASINO
        </h1>
        <p className="mt-1 text-sm text-zinc-400">最懂你的雲端娛樂城</p>
      </div>

      {/* 中央玻璃卡 */}
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-[0_10px_50px_rgba(0,0,0,.35)] p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-semibold text-white/90">登入帳號</h2>
            <p className="text-sm text-zinc-400 mt-1">請輸入您的 Email 與密碼</p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm text-zinc-300 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-zinc-400 px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-400/60"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-300 mb-1">密碼</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/10 text-white placeholder:text-zinc-400 px-4 py-2.5 outline-none focus:ring-2 focus:ring-emerald-400/60"
                  placeholder="••••••••"
                />
              </div>

              {errMsg && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-400/20 rounded-lg px-3 py-2">
                  {errMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black font-semibold py-2.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "登入中…" : "登入"}
              </button>
            </form>

            <div className="mt-5 text-xs text-zinc-400 text-center">
              登入即代表同意本平台服務條款
            </div>
          </div>

          {/* 玻璃陰影底座 */}
          <div className="mx-auto mt-6 h-2 w-40 rounded-full bg-black/70 blur-2xl"></div>
        </div>
      </div>
    </div>
  );
}

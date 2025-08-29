// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "登入失敗");
      router.push("/lobby");
    } catch (e: any) {
      setErr(e.message || "登入失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900 via-slate-900 to-black">
      <div className="relative w-full max-w-md">
        {/* 背景流光 */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-fuchsia-500/30 via-cyan-400/30 to-amber-400/30 blur-2xl animate-pulse" />
        {/* 玻璃卡片 */}
        <form
          onSubmit={onSubmit}
          className="relative rounded-3xl border border-white/15 bg-white/10 backdrop-blur-xl p-8 shadow-2xl"
        >
          <h1 className="text-2xl font-bold tracking-wider text-white text-center">TOPZCASINO</h1>
          <p className="mt-1 text-center text-white/70 text-sm">歡迎回來，請先登入</p>

          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="text-white/80 text-sm">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
                className="mt-1 w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400/60"
                placeholder="you@example.com"
                required
              />
            </label>

            <label className="block">
              <span className="text-white/80 text-sm">密碼</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
                className="mt-1 w-full rounded-xl bg-white/5 border border-white/15 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-cyan-400/60"
                placeholder="••••••••"
                required
              />
            </label>

            {err && <div className="text-rose-300 text-sm">{err}</div>}

            <button
              disabled={busy}
              className="mt-2 w-full rounded-xl bg-gradient-to-r from-fuchsia-500 to-cyan-400 py-2 font-semibold text-black hover:opacity-90 active:opacity-80 disabled:opacity-60 transition"
            >
              {busy ? "登入中..." : "登入"}
            </button>
          </div>

          <div className="mt-4 text-[11px] text-white/50 text-center">
            已支援 Render、JWT Cookie、Prisma
          </div>
        </form>
      </div>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
      setMsg("登入成功，前往大廳…");
      router.replace("/casino");
    } catch (err: any) {
      setMsg(err?.message || "登入失敗");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="glass neon w-full max-w-md p-7 rounded-2xl">
        <h1 className="text-3xl font-extrabold text-center tracking-[.25em] mb-6">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 via-brand-200 to-brand-500">
            TOPZCASINO
          </span>
        </h1>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="text-sm opacity-80">電子信箱</label>
            <input
              className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/15 focus:outline-none focus:ring-2 focus:ring-brand-500"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm opacity-80">密碼</label>
            <input
              className="w-full px-4 py-3 rounded-lg bg-black/20 border border-white/15 focus:outline-none focus:ring-2 focus:ring-brand-500"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" disabled={loading} className={`btn w-full rounded-lg ${loading ? "shimmer opacity-80 cursor-not-allowed" : ""}`}>
            {loading ? "登入中…" : "登入"}
          </button>
        </form>

        {msg && <div className="mt-4 text-center text-sm opacity-90">{msg}</div>}

        <div className="mt-6 text-center text-xs opacity-70">
          想先看看？ <a className="underline hover:opacity-100" href="/casino">進入大廳</a>
        </div>
      </div>
    </div>
  );
}

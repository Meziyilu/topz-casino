"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 若已登入就直接去 lobby
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (res.ok) {
          const d = await res.json();
          if (d?.user?.id) router.replace("/lobby");
        }
      } catch {}
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      setErr("請輸入 Email 與密碼");
      return;
    }
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
      router.replace("/lobby");
    } catch (e:any) {
      setErr(e?.message ?? "登入失敗");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-[#0b0f19] to-black">
      {/* 背景光暈 */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-30 blur-3xl"
           style={{ background: "radial-gradient(closest-side, rgba(139,92,246,.45), rgba(0,0,0,0))" }} />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 w-[900px] h-[900px] rounded-full opacity-25 blur-3xl"
           style={{ background: "radial-gradient(closest-side, rgba(34,197,94,.35), rgba(0,0,0,0))" }} />

      <div className="center-screen p-6">
        <div className="glass-card glow-ring sheen max-w-md w-full p-8 animate-fade-in">
          <div className="text-center mb-6">
            <div className="text-2xl font-bold tracking-[0.2em] text-shine">TOPZCASINO</div>
            <div className="text-sm text-white/70 mt-2">請先登入您的帳號</div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-2 text-white/80">Email</label>
              <input
                className="input-dark"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="block text-sm mb-2 text-white/80">密碼</label>
              <input
                className="input-dark"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {err && (
              <div className="text-red-300 text-sm bg-red-500/10 border border-red-400/30 rounded p-2">
                {err}
              </div>
            )}

            <button
              className="btn w-full shimmer"
              type="submit"
              disabled={busy}
            >
              {busy ? "登入中…" : "登入"}
            </button>
          </form>

          <div className="hr-faint my-6" />
          <div className="text-xs text-white/60 text-center">
            任何問題請聯繫客服。祝您遊玩愉快！
          </div>
        </div>
      </div>
    </div>
  );
}

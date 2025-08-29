// app/auth/AuthClient.tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function AuthClient() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-white">載入中…</div>}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/lobby";

  const [tab, setTab] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) router.replace(next);
    else {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || "登入失敗");
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/auth/register", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
    if (res.ok) router.replace("/lobby");
    else {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || "註冊失敗");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b1120] via-[#1e1b4b] to-[#0b1120]" />
      <div className="absolute inset-0 -z-10 opacity-40"
           style={{ backgroundImage: "radial-gradient(ellipse at top, rgba(99,102,241,0.22), transparent 60%)" }} />
      <div className="glass glow-ring rounded-2xl p-6 md:p-8 w-full max-w-md sheen">
        <div className="text-center mb-6">
          <div className="text-2xl font-black tracking-wider mb-1">TOPZCASINO</div>
          <div className="text-sm opacity-75">歡迎來到娛樂城，請先登入或註冊</div>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-white/5 rounded-lg p-1 mb-6">
          <button
            className={`py-2 rounded-md ${tab === "login" ? "bg-white/20 font-bold" : "opacity-80 hover:opacity-100"}`}
            onClick={() => setTab("login")}
            type="button"
          >
            登入
          </button>
          <button
            className={`py-2 rounded-md ${tab === "register" ? "bg-white/20 font-bold" : "opacity-80 hover:opacity-100"}`}
            onClick={() => setTab("register")}
            type="button"
          >
            註冊
          </button>
        </div>

        {tab === "login" ? (
          <form onSubmit={onLogin} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 opacity-80">Email</label>
              <input
                className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/15 focus:outline-none focus:border-white/40"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 opacity-80">密碼</label>
              <input
                className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/15 focus:outline-none focus:border-white/40"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="輸入密碼"
              />
            </div>
            <button type="submit" className="btn w-full">登入</button>
          </form>
        ) : (
          <form onSubmit={onRegister} className="space-y-4">
            <div>
              <label className="block text-sm mb-1 opacity-80">暱稱（可選）</label>
              <input
                className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/15 focus:outline-none focus:border-white/40"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="想顯示的名稱"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 opacity-80">Email</label>
              <input
                className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/15 focus:outline-none focus:border-white/40"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 opacity-80">密碼</label>
              <input
                className="w-full px-3 py-2 rounded-md bg-white/10 border border-white/15 focus:outline-none focus:border-white/40"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="至少 6 碼"
              />
            </div>
            <button type="submit" className="btn w-full">註冊</button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/lobby" className="opacity-70 hover:opacity-100 text-sm">
            我已登入？前往大廳 →
          </Link>
        </div>
      </div>
    </div>
  );
}

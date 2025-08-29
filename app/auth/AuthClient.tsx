"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthClient() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login" ? { email, password } : { email, password, name };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "操作失敗");

      if (mode === "login") {
        // 登入成功 → 進大廳
        router.replace("/lobby");
      } else {
        // 註冊成功 → 切到登入
        setMode("login");
      }
    } catch (e: any) {
      setErr(e.message || "發生錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-slate-900 to-black
                    flex items-center justify-center p-6">
      <div className="glass rounded-2xl p-8 max-w-md w-full glow-ring">
        <h1 className="text-3xl font-extrabold tracking-wider mb-6 text-white">TOPZCASINO</h1>

        <div className="flex gap-2 mb-6">
          <button
            className={`btn ${mode === "login" ? "" : "opacity-60"}`}
            onClick={() => setMode("login")}
          >
            登入
          </button>
          <button
            className={`btn ${mode === "register" ? "" : "opacity-60"}`}
            onClick={() => setMode("register")}
          >
            註冊
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm text-slate-300 mb-1">暱稱（可選）</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md bg-white/10 border border-white/15 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="你的暱稱"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-slate-300 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-white/10 border border-white/15 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-1">密碼</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-white/10 border border-white/15 px-3 py-2 text-white outline-none focus:ring-2 focus:ring-purple-400"
              placeholder="******"
            />
          </div>

        {err && <p className="text-red-400 text-sm">{err}</p>}

          <button disabled={loading} className="btn w-full">
            {loading ? "處理中…" : mode === "login" ? "登入" : "註冊"}
          </button>
        </form>

        <p className="mt-4 text-center text-slate-300 text-sm">
          {mode === "login" ? (
            <>
              還沒有帳號？{" "}
              <button className="underline" onClick={() => setMode("register")}>前往註冊</button>
            </>
          ) : (
            <>
              已有帳號？{" "}
              <button className="underline" onClick={() => setMode("login")}>馬上登入</button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

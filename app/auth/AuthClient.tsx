// app/auth/AuthClient.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function AuthClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialMode = sp.get("tab") === "register" ? "register" : "login";
  const [mode, setMode] = useState<"login" | "register">(initialMode);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const r = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "失敗");
      // 登入/註冊成功 → 進大廳
      router.push("/lobby");
      router.refresh();
    } catch (err: any) {
      setMsg(err.message || "發生錯誤");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-casino-bg text-white grid place-items-center">
      <div className="w-full max-w-md p-6 glass rounded-xl glow-ring">
        <h1 className="text-2xl font-extrabold text-center mb-4 tracking-wider">
          TOPZCASINO
        </h1>
        <div className="flex gap-2 justify-center mb-4">
          <button
            className={`btn px-4 py-2 ${mode === "login" ? "" : "opacity-60"}`}
            onClick={() => setMode("login")}
          >
            登入
          </button>
          <button
            className={`btn px-4 py-2 ${mode === "register" ? "" : "opacity-60"}`}
            onClick={() => setMode("register")}
          >
            註冊
          </button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            className="w-full px-3 py-2 rounded bg-white/10 border border-white/15 focus:outline-none"
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />
          <input
            className="w-full px-3 py-2 rounded bg-white/10 border border-white/15 focus:outline-none"
            placeholder="密碼"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            required
          />
          {msg && <p className="text-red-300 text-sm">{msg}</p>}
          <button className="btn w-full py-2" disabled={busy}>
            {busy ? "處理中…" : mode === "login" ? "登入" : "建立帳號"}
          </button>
        </form>
      </div>
    </main>
  );
}

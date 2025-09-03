"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { setMsg(j.error || "登入失敗"); return; }
    location.href = "/";
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl mb-4">登入</h1>
      {msg && <div className="mb-3 text-red-500">{msg}</div>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="Email"
          value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="密碼" type="password"
          value={password} onChange={e=>setPassword(e.target.value)} />
        <button disabled={loading} className="w-full border p-2 rounded">
          {loading ? "登入中..." : "登入"}
        </button>
      </form>
      <div className="mt-3 text-sm">
        <a href="/register" className="underline">沒有帳號？去註冊</a> · <a href="/reset-password" className="underline">忘記密碼？</a>
      </div>
    </main>
  );
}

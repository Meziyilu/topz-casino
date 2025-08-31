"use client";

export const dynamic = "force-dynamic";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function BankRegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        setErr(j?.error || r.statusText || "註冊失敗");
        return;
      }
      // 註冊成功 → 自動登入
      const r2 = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j2 = await r2.json().catch(() => ({}));
      if (r2.ok && j2?.ok) {
        const token = j2?.token || j2?.accessToken || j2?.jwt || j2?.data?.token;
        if (token) {
          localStorage.setItem("token", token);
          localStorage.setItem("jwt", token);
          localStorage.setItem("access_token", token);
        }
        router.replace("/bank");
        return;
      }
      router.replace("/bank/login");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <div className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl">
        <h1 className="text-2xl font-extrabold mb-6">註冊銀行帳號</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input className="w-full p-3 rounded-xl border border-white/10 bg-white/5" placeholder="暱稱（可選）" value={name} onChange={e=>setName(e.target.value)} />
          <input className="w-full p-3 rounded-xl border border-white/10 bg-white/5" placeholder="Email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required />
          <input className="w-full p-3 rounded-xl border border-white/10 bg-white/5" placeholder="密碼" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          {err && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm">{err}</div>}
          <button type="submit" disabled={busy} className="w-full py-3 rounded-2xl text-white bg-gradient-to-r from-emerald-500 to-teal-600 disabled:opacity-50">
            {busy ? "送出中…" : "建立帳號並登入"}
          </button>
        </form>
        <div className="mt-6 text-sm opacity-80">
          已有帳號？<Link className="hover:underline" href="/bank/login">返回銀行登入</Link>
        </div>
      </div>
    </div>
  );
}

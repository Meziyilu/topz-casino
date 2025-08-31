"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";

export default function BankForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const r = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        setErr(j?.error || r.statusText || "發送失敗");
      } else {
        setMsg(j?.message || "重設連結已寄出，請查收 Email。");
        // 開發期會回傳 resetLink，可顯示出來方便點擊
        if (j.resetLink) setMsg(`${j.message || "已產生重設連結"}：${j.resetLink}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <div className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl">
        <h1 className="text-2xl font-extrabold mb-6">忘記密碼（銀行）</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <input className="w-full p-3 rounded-xl border border-white/10 bg-white/5" type="email" placeholder="你註冊的 Email" value={email} onChange={e=>setEmail(e.target.value)} required />
          {err && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm">{err}</div>}
          {msg && <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm break-all">{msg}</div>}
          <button type="submit" disabled={busy} className="w-full py-3 rounded-2xl text-white bg-gradient-to-r from-amber-500 to-pink-600 disabled:opacity-50">
            {busy ? "處理中…" : "寄送重設連結"}
          </button>
        </form>
        <div className="mt-6 text-sm opacity-80">
          <Link className="hover:underline" href="/bank/login">返回銀行登入</Link>
        </div>
      </div>
    </div>
  );
}

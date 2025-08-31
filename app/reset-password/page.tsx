// app/reset-password/page.tsx
"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen grid place-items-center text-white">載入中…</div>}>
      <ResetInner />
    </Suspense>
  );
}

function ResetInner() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") || "";

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) {
        setErr(j?.error || r.statusText || "重設失敗");
      } else {
        setOk(true);
        setTimeout(() => router.replace("/login"), 1200);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-white bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <div className="w-full max-w-md p-8 rounded-3xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl">
        <h1 className="text-2xl font-extrabold mb-6">重設密碼</h1>
        {!token && <div className="mb-4 rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm">缺少 token，請重新申請忘記密碼。</div>}
        <form onSubmit={onSubmit} className="space-y-4">
          <input className="w-full p-3 rounded-xl border border-white/10 bg-white/5" placeholder="新密碼" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          {err && <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-3 text-sm">{err}</div>}
          {ok && <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 text-sm">已重設，將為你導回登入頁…</div>}
          <button type="submit" disabled={busy || !token} className="w-full py-3 rounded-2xl text-white bg-gradient-to-r from-cyan-500 to-blue-600 disabled:opacity-50">
            {busy ? "處理中…" : "設定新密碼"}
          </button>
        </form>
      </div>
    </div>
  );
}

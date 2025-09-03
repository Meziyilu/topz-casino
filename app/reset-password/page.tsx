"use client";
import { useState } from "react";

export default function ResetPasswordPage() {
  const token = typeof window !== "undefined" ? new URLSearchParams(location.search).get("token") : null;
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const r = await fetch("/api/auth/reset", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password })
    });
    const j = await r.json();
    if (!r.ok) { setMsg(j.error || "重設失敗"); return; }
    setOk(true); setMsg("已重設，請前往登入");
  }

  if (!token) return <main className="max-w-md mx-auto p-6">缺少 token</main>;

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl mb-4">重設密碼</h1>
      {msg && <div className={ok ? "text-green-600" : "text-red-500"}>{msg}</div>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border p-2 rounded" type="password" placeholder="新密碼"
          value={password} onChange={e=>setPassword(e.target.value)} />
        <button className="w-full border p-2 rounded">送出</button>
      </form>
      {ok && <div className="mt-3 text-sm"><a className="underline" href="/login">回登入</a></div>}
    </main>
  );
}

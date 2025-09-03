"use client";
import { useState } from "react";

export default function RegisterPage() {
  const [f, setF] = useState({ email:"", displayName:"", password:"", referralCode:"" });
  const [agree, setAgree] = useState({ isOver18:false, acceptTOS:false });
  const [msg, setMsg] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof typeof f>(k: K, v: string){ setF(s=>({ ...s, [k]: v })); }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    const r = await fetch("/api/auth/register", {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify({ ...f, referralCode: f.referralCode || undefined, isOver18: agree.isOver18, acceptTOS: agree.acceptTOS }),
    });
    const j = await r.json();
    setLoading(false);
    if (!r.ok) { setMsg(j.error || "註冊失敗"); return; }
    setVerifyUrl(j.verificationUrl || null);
    setMsg("註冊成功，請前往信箱點擊驗證連結（測試模式下已顯示驗證連結）");
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl mb-4">註冊</h1>
      {msg && <div className="mb-3 text-green-600">{msg}</div>}
      {verifyUrl && <div className="mb-3 text-sm break-all">驗證連結：<a className="underline" href={verifyUrl}>{verifyUrl}</a></div>}
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border p-2 rounded" placeholder="Email"
          value={f.email} onChange={e=>set("email", e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="暱稱（2-20，中文/英數/底線）"
          value={f.displayName} onChange={e=>set("displayName", e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="密碼（8-64，含大小寫+數字）" type="password"
          value={f.password} onChange={e=>set("password", e.target.value)} />
        <input className="w-full border p-2 rounded" placeholder="推薦碼（選填）"
          value={f.referralCode} onChange={e=>set("referralCode", e.target.value)} />
        <label className="block"><input type="checkbox" checked={agree.isOver18} onChange={e=>setAgree(s=>({...s,isOver18:e.target.checked}))} /> 我已年滿 18 歲</label>
        <label className="block"><input type="checkbox" checked={agree.acceptTOS} onChange={e=>setAgree(s=>({...s,acceptTOS:e.target.checked}))} /> 我同意服務條款與隱私</label>
        <button disabled={loading} className="w-full border p-2 rounded">
          {loading ? "送出中..." : "建立帳號"}
        </button>
      </form>
      <div className="mt-3 text-sm">
        <a href="/login" className="underline">已有帳號？去登入</a>
      </div>
    </main>
  );
}

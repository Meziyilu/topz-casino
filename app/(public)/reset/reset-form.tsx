// app/(public)/reset/reset-form.tsx
"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResetForm({ initialToken }: { initialToken: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));

    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setLoading(false);

    if (data.ok) setMsg("密碼已更新，請前往登入。");
    else setMsg(data.msg || "重設失敗");
  }

  return (
    <form className="tc-grid" onSubmit={onSubmit} noValidate>
      <div className="tc-input">
        <input name="token" placeholder=" " defaultValue={initialToken} required />
        <span className="tc-label">重設 Token</span>
      </div>

      <div className="tc-input">
        <input
          name="newPassword"
          type={showPwd ? "text" : "password"}
          placeholder=" "
          required
          minLength={6}
        />
        <span className="tc-label">新密碼（至少 6 碼）</span>
        <button
          type="button"
          className="tc-eye"
          aria-label="顯示/隱藏密碼"
          onClick={() => setShowPwd((s) => !s)}
        >
          👁
        </button>
      </div>

      <button className="tc-btn" disabled={loading}>
        {loading ? "更新中…" : "更新密碼"}
      </button>

      {msg && <div className="tc-hint" style={{ marginTop: 8 }}>{msg}</div>}

      <div className="tc-sep"></div>
      <div className="tc-hint">
        完成後請 <Link className="tc-link" href="/login">返回登入</Link>
      </div>
    </form>
  );
}

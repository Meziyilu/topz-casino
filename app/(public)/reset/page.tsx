"use client";
import { useState } from "react";
import Link from "next/link";

export default function ResetPage() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));

    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          token: body.token ?? "",
          newPassword: body.newPassword ?? "",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data?.error ?? "RESET_FAILED");
      } else {
        setMsg("密碼已更新，請用新密碼登入。");
        // 2 秒後回登入
        setTimeout(() => (window.location.href = "/login"), 2000);
      }
    } catch {
      setErr("NETWORK_ERROR");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="tc-auth-card tc-follow">
      <div className="tc-card-inner">
        <div className="tc-brand">TOPZCASINO</div>

        <div className="tc-tabs">
          <Link href="/login" className="tc-tab">登入</Link>
          <Link href="/register" className="tc-tab">註冊</Link>
          <span className="tc-tab active" aria-current="page">重設密碼</span>
        </div>

        <form className="tc-grid" onSubmit={onSubmit} noValidate>
          <div className="tc-input">
            <input name="token" type="text" placeholder=" " required />
            <span className="tc-label">重設代碼</span>
          </div>

          <div className="tc-input">
            <input name="newPassword" type="password" placeholder=" " required minLength={6} />
            <span className="tc-label">新密碼</span>
          </div>

          {err && <div className="tc-error">{err}</div>}
          {msg && <div className="tc-ok">{msg}</div>}

          <button className="tc-btn" disabled={loading}>
            {loading ? "更新中…" : "更新密碼"}
          </button>
        </form>
      </div>

      {/* 同樣用 link，而非 import */}
      <link rel="stylesheet" href="/styles/auth-theme.css" />
    </main>
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPage() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });
    setLoading(false);
    if (res.ok) setDone(true);
  }

  return (
    <main className="tc-auth-wrap">
      <div className="tc-bg-glow" />
      <div className="tc-particles" aria-hidden />
      <div className="tc-auth-card tc-follow">
        <div className="tc-card-inner">
          <div className="tc-brand">TOPZCASINO</div>

          <div className="tc-tabs">
            <Link href="/login" className="tc-tab">登入</Link>
            <Link href="/register" className="tc-tab">註冊</Link>
          </div>

          {done ? (
            <div className="tc-hint" style={{padding:"12px 0"}}>
              如果該信箱存在，我們已寄出重設連結。
              <div style={{marginTop:8}}><Link href="/login" className="tc-link">返回登入</Link></div>
            </div>
          ) : (
            <form className="tc-form" onSubmit={onSubmit} noValidate>
              <div className="tc-input">
                <input name="email" type="email" placeholder=" " required />
                <span className="tc-label">電子信箱</span>
              </div>
              <button className="tc-btn" disabled={loading}>{loading ? "送出中…" : "寄送重設連結"}</button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}

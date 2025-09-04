// app/(public)/reset/page.tsx
"use client";
import Link from "next/link";
import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import "../auth-theme.css";

export default function ResetPage() {
  const sp = useSearchParams();
  const tokenInUrl = sp.get("token") || "";
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const defaultToken = useMemo(() => tokenInUrl, [tokenInUrl]);

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

    if (data.ok) {
      setMsg("密碼已更新，請前往登入。");
    } else {
      setMsg(data.msg || "重設失敗");
    }
  }

  return (
    <main className="tc-auth-card tc-follow">
      <div className="tc-card-inner">
        {/* 置中文字 LOGO */}
        <div className="tc-brand">TOPZCASINO</div>

        {/* 分頁切換 */}
        <div className="tc-tabs">
          <Link href="/login" className="tc-tab">登入</Link>
          <Link href="/register" className="tc-tab">註冊</Link>
          <span className="tc-tab active" aria-current="page">重設密碼</span>
        </div>

        <form className="tc-grid" onSubmit={onSubmit} noValidate>
          <div className="tc-input">
            <input name="token" placeholder=" " defaultValue={defaultToken} required />
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
      </div>
    </main>
  );
}

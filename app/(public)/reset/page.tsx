"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ResetForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));
    body.token = token;

    const res = await fetch("/api/auth/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (res.ok) {
      alert("密碼已更新，請重新登入");
      router.push("/login");
    } else {
      const msg = await res.text().catch(() => "");
      alert(`重設失敗：${msg || "請稍後再試"}`);
    }
  }

  return (
    <main className="tc-auth-card tc-follow">
      <link rel="stylesheet" href="/styles/auth-theme.css" />

      <div className="tc-card-inner">
        <div className="tc-brand">TOPZCASINO</div>

        <div className="tc-tabs">
          <Link href="/login" className="tc-tab">登入</Link>
          <Link href="/register" className="tc-tab">註冊</Link>
          <span className="tc-tab active" aria-current="page">重設密碼</span>
        </div>

        <form className="tc-grid" onSubmit={onSubmit} noValidate>
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
        </form>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ResetForm />
    </Suspense>
  );
}

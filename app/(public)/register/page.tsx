"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    const body: Record<string, string | boolean> = {};
    fd.forEach((v, k) => (body[k] = String(v)));
    // 後端有驗證 isOver18 / acceptTOS，可確保有傳
    body.isOver18 = !!fd.get("isOver18");
    body.acceptTOS = !!fd.get("acceptTOS");

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include",
    });

    setLoading(false);

    if (res.ok) {
      // 註冊完成 -> 導回登入
      router.push("/login?reg=1");
    } else {
      const msg = await res.text().catch(() => "");
      alert(`註冊失敗：${msg || "請檢查欄位或換個暱稱/信箱"}`);
    }
  }

  return (
    <main className="tc-auth-card tc-follow">
      <link rel="stylesheet" href="/styles/auth-theme.css" />

      <div className="tc-card-inner">
        <div className="tc-brand">TOPZCASINO</div>

        <div className="tc-tabs">
          <Link href="/login" className="tc-tab">登入</Link>
          <span className="tc-tab active" aria-current="page">註冊</span>
        </div>

        <form className="tc-grid" onSubmit={onSubmit} noValidate>
          <div className="tc-input">
            <input name="displayName" placeholder=" " required minLength={2} maxLength={20} />
            <span className="tc-label">玩家暱稱</span>
          </div>

          <div className="tc-input">
            <input name="email" type="email" placeholder=" " required />
            <span className="tc-label">電子信箱</span>
          </div>

          <div className="tc-input">
            <input
              name="password"
              type={showPwd ? "text" : "password"}
              placeholder=" "
              required
              minLength={6}
            />
            <span className="tc-label">密碼（至少 6 碼）</span>
            <button
              type="button"
              className="tc-eye"
              aria-label="顯示/隱藏密碼"
              onClick={() => setShowPwd((s) => !s)}
            >
              👁
            </button>
          </div>

          <div className="tc-input">
            <input name="referralCode" placeholder=" " />
            <span className="tc-label">推薦碼（選填）</span>
          </div>

          <label className="tc-row" style={{ gap: 8 }}>
            <input type="checkbox" name="isOver18" required />
            我已年滿 18 歲
          </label>

          <label className="tc-row" style={{ gap: 8 }}>
            <input type="checkbox" name="acceptTOS" required />
            我同意服務條款
          </label>

          <button className="tc-btn" disabled={loading}>
            {loading ? "送出中…" : "建立帳號"}
          </button>

          <div className="tc-sep"></div>
          <div className="tc-hint">
            已有帳號？<Link className="tc-link" href="/login">回到登入</Link>
          </div>
        </form>
      </div>
    </main>
  );
}

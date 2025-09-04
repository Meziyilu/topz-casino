// app/(public)/login/page.tsx
'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

// 讓此頁不要被預產生，避免 CSR hook 在 SSG 時報錯
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="tc-auth-card"><div className="tc-card-inner">Loading…</div></div>}>
      <LoginCard />
    </Suspense>
  );
}

function LoginCard() {
  const router = useRouter();
  const search = useSearchParams(); // ← 這裡已經被 Suspense 包住了
  const nextPath = search.get('next') || '/';

  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

    setLoading(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data?.error ?? 'LOGIN_FAILED');
      return;
    }

    // 登入成功：以 replace() 進大廳（或 next 參數）
    router.replace(nextPath);
  }

  return (
    <main className="tc-auth-card tc-follow">
      <div className="tc-card-inner">
        {/* 置中大字 LOGO */}
        <div className="tc-brand">TOPZCASINO</div>

        {/* 分頁切換 */}
        <div className="tc-tabs">
          <Link href="/login" className="tc-tab active" aria-current="page">登入</Link>
          <Link href="/register" className="tc-tab">註冊</Link>
        </div>

        <form className="tc-grid" onSubmit={onSubmit} noValidate>
          <div className="tc-input">
            <input name="email" type="email" placeholder=" " required />
            <span className="tc-label">電子信箱</span>
          </div>

          <div className="tc-input">
            <input
              name="password"
              type={showPwd ? 'text' : 'password'}
              placeholder=" "
              required
              minLength={6}
            />
            <span className="tc-label">密碼</span>
            <button
              type="button"
              className="tc-eye"
              aria-label="顯示/隱藏密碼"
              onClick={() => setShowPwd((s) => !s)}
            >
              👁
            </button>
          </div>

          <div className="tc-row" style={{ justifyContent: 'space-between' }}>
            <label className="tc-row" style={{ gap: 8 }}>
              <input type="checkbox" name="remember" />
              記住我
            </label>
            <Link href="/forgot" className="tc-link">忘記密碼？</Link>
          </div>

          {err && <div className="tc-error">{err}</div>}

          <button className="tc-btn" disabled={loading}>
            {loading ? '登入中…' : '登入'}
          </button>

          <div className="tc-sep"></div>
          <div className="tc-hint">
            還沒有帳號？<Link className="tc-link" href="/register">前往註冊</Link>
          </div>
        </form>
      </div>
    </main>
  );
}

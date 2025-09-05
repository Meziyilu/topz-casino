// app/(public)/login/page.tsx
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp?.get('next') || '/';
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 確保載入 CSS（你說放在 public/styles/auth-theme.css）
  useEffect(() => {
    const id = 'auth-theme';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = '/styles/auth-theme.css';
      document.head.appendChild(link);
    }
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setErr(null);

    const fd = new FormData(e.currentTarget);
    const body: Record<string, string> = {};
    fd.forEach((v, k) => (body[k] = String(v)));

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'include',             // ⬅️ 確保設 cookie
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data?.error || 'LOGIN_FAILED');
        return;
      }

      router.replace(next || '/');          // ⬅️ 成功導回
    } catch {
      setErr('NETWORK_ERROR');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="tc-auth-card tc-follow">
      <div className="tc-card-inner">
        <div className="tc-brand">TOPZCASINO</div>

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
              onClick={() => setShowPwd(s => !s)}
            >
              👁
            </button>
          </div>

          {err && <div className="tc-error">登入失敗：{err}</div>}

          <div className="tc-row" style={{ justifyContent: 'space-between' }}>
            <label className="tc-row" style={{ gap: 8 }}>
              <input type="checkbox" name="remember" />
              記住我
            </label>
            <Link href="/forgot" className="tc-link">忘記密碼？</Link>
          </div>

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

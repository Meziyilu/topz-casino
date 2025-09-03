'use client';
import '../auth-theme.css';
import { useState } from 'react';

export default function RegisterPage() {
  const [msg, setMsg] = useState<{ t: 'e' | 's'; m: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [over18, setOver18] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    if (!accepted || !over18) {
      setMsg({ t: 'e', m: '請勾選已滿18歲並同意使用條款' });
      return;
    }
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set('acceptTOS', 'true');
    fd.set('isOver18', 'true');

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      body: fd,
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      const m = data?.message ?? '註冊失敗';
      setMsg({ t: 'e', m });
      return;
    }

    setMsg({ t: 's', m: '註冊成功，請至信箱點擊驗證連結。' });
    if (data?.verifyUrl) {
      // 方便測試（若未串信件）
      console.log('Verify URL:', data.verifyUrl);
    }
  }

  return (
    <div className="auth-bg" style={{ display: 'grid', placeItems: 'center' }}>
      <form onSubmit={onSubmit} className="auth-card">
        <div className="brand">TOPZCASINO</div>
        <h1 className="auth-title">註冊</h1>

        {msg && <div className={msg.t === 'e' ? 'auth-error' : 'auth-success'}>{msg.m}</div>}

        <input name="displayName" type="text" placeholder="暱稱（2-20字，中文/英數/底線）" className="auth-input" required />
        <input name="email" type="email" placeholder="Email" className="auth-input" required />
        <input name="password" type="password" placeholder="密碼（至少8碼）" className="auth-input" required />
        <input name="referralCode" type="text" placeholder="邀請碼（選填）" className="auth-input" />

        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, marginTop: 6 }}>
          <input type="checkbox" checked={over18} onChange={(e) => setOver18(e.target.checked)} />
          我已年滿 18 歲
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12 }}>
          <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
          我同意服務條款與隱私政策
        </label>

        <button className="auth-button" disabled={loading}>{loading ? '送出中…' : '創建帳號'}</button>
        <a className="auth-link" href="/login">已有帳號？去登入</a>
      </form>
    </div>
  );
}

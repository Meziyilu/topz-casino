// app/(public)/register/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pwd, setPwd] = useState('');
  const [ref, setRef] = useState('');
  const [agree, setAgree] = useState(false);
  const [is18, setIs18] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOkMsg(null); setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: pwd,
          displayName,
          referralCode: ref || undefined,
          isOver18: is18,
          acceptTOS: agree,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setErr(data?.message ?? '註冊失敗'); setLoading(false); return;
      }
      setOkMsg('註冊成功，請收信完成驗證！');
      setTimeout(() => router.push('/login'), 1200);
    } catch (e) {
      setErr('連線異常，請稍後再試');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card" role="dialog" aria-labelledby="reg-title">
      <div className="card-head">
        <div className="card-title" id="reg-title">建立帳號</div>
        <div className="card-sub">加入 TOPZCASINO，開啟你的娛樂旅程</div>
      </div>

      {err && <div className="error">{err}</div>}
      {okMsg && <div className="error" style={{borderColor:'rgba(52,211,153,.45)', background:'linear-gradient(180deg, rgba(52,211,153,.12), rgba(52,211,153,.08))', color:'#d1fae5'}}>{okMsg}</div>}

      <form className="form" onSubmit={onSubmit} noValidate>
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input" type="email" placeholder="you@example.com"
                 value={email} onChange={(e)=>setEmail(e.target.value)} required autoComplete="email" />
        </div>

        <div className="field">
          <label className="label" htmlFor="displayName">暱稱（2–20字，中文/英數/底線）</label>
          <input id="displayName" className="input" type="text" placeholder="玩家暱稱"
                 value={displayName} onChange={(e)=>setDisplayName(e.target.value)} required autoComplete="nickname" />
        </div>

        <div className="field">
          <label className="label" htmlFor="password">密碼</label>
          <input id="password" className="input" type="password" placeholder="至少 6 碼"
                 value={pwd} onChange={(e)=>setPwd(e.target.value)} required autoComplete="new-password" />
        </div>

        <div className="field">
          <label className="label" htmlFor="ref">推薦碼（選填）</label>
          <input id="ref" className="input" type="text" placeholder="選填"
                 value={ref} onChange={(e)=>setRef(e.target.value)} />
        </div>

        <div className="row">
          <label className="label" style={{display:'flex', gap:8, alignItems:'center'}}>
            <input type="checkbox" checked={is18} onChange={(e)=>setIs18(e.target.checked)} />
            我已年滿 18 歲
          </label>
          <label className="label" style={{display:'flex', gap:8, alignItems:'center'}}>
            <input type="checkbox" checked={agree} onChange={(e)=>setAgree(e.target.checked)} />
            我同意使用條款
          </label>
        </div>

        <div className="row">
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? '建立中…' : '建立帳號'}
          </button>
          <a className="hint" href="/login">已有帳號？前往登入</a>
        </div>
      </form>
    </div>
  );
}

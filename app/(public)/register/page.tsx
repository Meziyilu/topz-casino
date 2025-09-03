'use client';

import { useState } from 'react';

export default function RegisterPage() {
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('P@ssw0rd!');
  const [displayName, setDisplayName] = useState('玩家_001');
  const [referralCode, setReferralCode] = useState('');
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const payload = {
      email, password, displayName,
      referralCode: referralCode || undefined,
      isOver18: true, acceptTOS: true,
    };
    const res = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (res.ok) {
      setVerifyUrl(j.verifyUrl);
      setMsg('註冊成功！請點擊驗證連結完成驗證。');
    } else {
      setMsg(j.error ?? '註冊失敗');
    }
  }

  return (
    <main>
      <h2>註冊</h2>
      <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8, maxWidth: 420 }}>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密碼 (≥8)" type="password" />
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="暱稱（2–20，中英數與底線）" />
        <input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder="邀請碼（可選）" />
        <button type="submit">建立帳號</button>
      </form>
      {msg && <p style={{ color: verifyUrl ? 'green' : 'crimson' }}>{msg}</p>}
      {verifyUrl && (
        <p>測試用驗證連結： <a href={verifyUrl}>{verifyUrl}</a></p>
      )}
    </main>
  );
}

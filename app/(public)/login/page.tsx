// app/(public)/login/page.tsx
'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function LoginPage() {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/';

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
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
    if (res.ok) {
      // 先用 replace，若 host 環境限制則 fallback
      try {
        router.replace(next);
      } catch {
        window.location.href = next;
      }
    } else {
      const data = await res.json().catch(() => ({}));
      alert(`登入失敗：${data?.error ?? res.status}`);
    }
  }

  return (
    <main style={{ minHeight:'100svh', display:'grid', placeItems:'center', padding:24 }}>
      <div style={{
        width:'min(420px, 92vw)',
        borderRadius:16,
        padding:24,
        background:'rgba(16,20,27,.5)',
        border:'1px solid rgba(255,255,255,.12)',
        boxShadow:'0 10px 30px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08), 0 0 80px rgba(0,180,255,.12)',
        backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)'
      }}>
        <div style={{ textAlign:'center', fontWeight:900, letterSpacing:3, fontSize:22, marginBottom:16 }}>TOPZCASINO</div>
        <div style={{ display:'flex', gap:12, marginBottom:12 }}>
          <a href="/login" aria-current="page" style={{ color:'#dce3ea', textDecoration:'none', fontWeight:700 }}>登入</a>
          <a href="/register" style={{ color:'#8ea2b5', textDecoration:'none' }}>註冊</a>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ position:'relative', marginBottom:12 }}>
            <input name="email" type="email" required placeholder="電子信箱"
              style={{ width:'100%', padding:'12px 14px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.14)', color:'#dce3ea' }}/>
          </div>
          <div style={{ position:'relative', marginBottom:16 }}>
            <input name="password" type={showPwd ? 'text' : 'password'} required minLength={6} placeholder="密碼"
              style={{ width:'100%', padding:'12px 44px 12px 14px', borderRadius:10, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.14)', color:'#dce3ea' }}/>
            <button type="button" onClick={() => setShowPwd(s => !s)}
              style={{ position:'absolute', right:8, top:8, border:0, background:'transparent', color:'#a9b9c7', cursor:'pointer' }}>
              {showPwd ? '隱藏' : '顯示'}
            </button>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
            <label style={{ display:'flex', gap:8, alignItems:'center', color:'#a9b9c7' }}>
              <input type="checkbox" name="remember" /> 記住我
            </label>
            <a href="/forgot" style={{ color:'#89b5ff', textDecoration:'none' }}>忘記密碼？</a>
          </div>

          <button disabled={loading} style={{
            width:'100%', padding:'12px 16px', borderRadius:10, border:'1px solid rgba(255,255,255,.18)',
            background:'linear-gradient(180deg, rgba(0,156,255,.9), rgba(0,120,210,.9))', color:'#fff', fontWeight:800, letterSpacing:1.2,
            boxShadow:'0 8px 24px rgba(0,150,255,.35)'
          }}>
            {loading ? '登入中…' : '登入'}
          </button>

          <div style={{ height:1, background:'linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent)', margin:'16px 0' }} />
          <div style={{ textAlign:'center', color:'#a9b9c7' }}>
            還沒有帳號？ <a href="/register" style={{ color:'#89b5ff', textDecoration:'none' }}>前往註冊</a>
          </div>
        </form>
      </div>
    </main>
  );
}

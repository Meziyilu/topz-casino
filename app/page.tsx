// app/page.tsx
"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main style={{
      minHeight: '100svh',
      display: 'grid',
      placeItems: 'center',
      padding: 24,
      background: 'radial-gradient(1200px 600px at 10% -10%, rgba(96,165,250,.18), transparent 60%), radial-gradient(1000px 800px at 110% 10%, rgba(167,139,250,.18), transparent 60%), radial-gradient(800px 700px at 50% 110%, rgba(253,164,175,.16), transparent 60%)'
    }}>
      {/* 掛上你的大廳樣式（不會影響登入註冊，因為各自有自己的 css link） */}
      <link rel="stylesheet" href="/styles/lobby.css" />

      <div style={{
        width: 'min(980px,92vw)',
        padding: 24,
        borderRadius: 16,
        background: 'rgba(16,20,27,.45)',
        border: '1px solid rgba(255,255,255,.12)',
        boxShadow: '0 10px 30px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08), 0 0 80px rgba(0,180,255,.12)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)'
      }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 22, letterSpacing: 2, fontWeight: 800 }}>TOPZCASINO</div>
          <nav style={{ display: 'flex', gap: 12, opacity: .9 }}>
            <Link href="/login" style={{ color: '#b9c7d6', textDecoration: 'none' }}>登入</Link>
            <Link href="/register" style={{ color: '#b9c7d6', textDecoration: 'none' }}>註冊</Link>
          </nav>
        </header>

        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 16 }}>大廳就緒 ✅</div>
        <p style={{ opacity: .8, marginTop: 8 }}>
          這是公開首頁。登入成功後，前端會把你導向 <code style={{opacity:.8}}>/{' '}</code>（本頁）並顯示大廳骨架。
        </p>

        <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {/* 先不做權限判斷，點了沒登入會被 API 擋；你要權限再加 ProtectedLink */}
          <Link href="/wallet" className="lb-btn">🏦 銀行</Link>
          <Link href="/casino/baccarat" className="lb-btn">🎴 百家樂</Link>
          <Link href="/casino/sicbo" className="lb-btn">🎲 骰寶</Link>
          <Link href="/casino/lotto" className="lb-btn">🎟 樂透</Link>
        </div>
      </div>
    </main>
  );
}

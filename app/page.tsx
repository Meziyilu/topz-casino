// app/page.tsx  （首頁就是大廳骨架）
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link';
import ProtectedLink from '@/components/ProtectedLink';

export default function LobbyPage() {
  return (
    <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24 }}>
      {/* 大廳樣式（沿用你的 lobby.css） */}
      <link rel="stylesheet" href="/styles/lobby.css" />
      <div style={{
        width: 'min(980px,92vw)',
        padding: 24,
        borderRadius: 16,
        background: 'rgba(16,20,27,.45)',
        border: '1px solid rgba(255,255,255,.12)',
        boxShadow: '0 10px 30px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08), 0 0 80px rgba(0,180,255,.12)',
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)'
      }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ fontSize: 22, letterSpacing: 2, fontWeight: 800 }}>TOPZCASINO</div>
          <nav style={{ display: 'flex', gap: 12, opacity: .9 }}>
            <ProtectedLink href="/profile" className="lb-btn">個人頁</ProtectedLink>
            <ProtectedLink href="/wallet"  className="lb-btn">錢包</ProtectedLink>
            <ProtectedLink href="/casino/baccarat" className="lb-btn">百家</ProtectedLink>
            <ProtectedLink href="/casino/sicbo"    className="lb-btn">骰寶</ProtectedLink>
          </nav>
        </header>

        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 16 }}>大廳就緒 ✅</div>
        <p style={{ opacity: .8, marginTop: 8 }}>
          首頁任何人都能看。點功能時才檢查登入：未登入 → 先去 /login，登入成功再回大廳繼續用。
        </p>

        <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/login" className="lb-btn">登入</Link>
          <Link href="/register" className="lb-btn">註冊</Link>
        </div>
      </div>
    </main>
  );
}

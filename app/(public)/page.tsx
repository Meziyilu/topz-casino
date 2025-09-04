// app/(public)/page.tsx
export const dynamic = 'force-dynamic'; // 避免被預先靜態化
export const revalidate = 0;

import Link from "next/link";
import Clock from "@/components/lobby/Clock";

export default function LobbyPage() {
  return (
    <main style={{
      minHeight: '100svh',
      display: 'grid',
      placeItems: 'center',
      background:
        'radial-gradient(1200px 600px at 80% -20%, rgba(0,180,255,.12), transparent 60%),' +
        'radial-gradient(900px 500px at -10% 20%, rgba(180,0,255,.10), transparent 60%),' +
        'linear-gradient(180deg, #0b0f14 0%, #0a0c10 100%)'
    }}>
      <div style={{
        width: 'min(960px, 92vw)',
        padding: 24,
        borderRadius: 16,
        background: 'rgba(16,20,27,.45)',
        border: '1px solid rgba(255,255,255,.12)',
        boxShadow:
          '0 10px 30px rgba(0,0,0,.5),' +
          'inset 0 1px 0 rgba(255,255,255,.08),' +
          '0 0 80px rgba(0,180,255,.12)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        color: '#dce3ea'
      }}>
        <header style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          marginBottom: 12
        }}>
          <div style={{ fontSize: 20, letterSpacing: 2, fontWeight: 800 }}>
            TOPZCASINO
          </div>
          <nav style={{ display: 'flex', gap: 12 }}>
            <Link href="/profile">個人頁</Link>
            <Link href="/wallet">錢包</Link>
            <Link href="/casino/baccarat">百家</Link>
            <Link href="/casino/sicbo">骰寶</Link>
          </nav>
          <Clock /> {/* 小型 client 元件，單純顯示現在時間 */}
        </header>

        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>
          大廳已就緒 ✅
        </div>
        <p style={{ opacity: .8, marginTop: 8 }}>
          這是「安全版」大廳骨架。等頁面穩定後，再逐步加上你的遊戲卡片、聊天室等 Client UI。
        </p>
      </div>
    </main>
  );
}

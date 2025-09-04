// app/(public)/page.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function LobbyPage() {
  return (
    <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24 }}>
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
            <a href="/profile" style={{ color: '#b9c7d6', textDecoration: 'none' }}>個人頁</a>
            <a href="/wallet" style={{ color: '#b9c7d6', textDecoration: 'none' }}>錢包</a>
            <a href="/casino/baccarat" style={{ color: '#b9c7d6', textDecoration: 'none' }}>百家</a>
            <a href="/casino/sicbo" style={{ color: '#b9c7d6', textDecoration: 'none' }}>骰寶</a>
          </nav>
        </header>
        <div style={{ fontSize: 28, fontWeight: 700, marginTop: 16 }}>大廳就緒 ✅</div>
        <p style={{ opacity: .8, marginTop: 8 }}>目前是穩定骨架。登入後應可直接看到這頁。</p>
      </div>
    </main>
  );
}

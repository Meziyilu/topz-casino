// app/page.tsx
async function fetchMe() {
  const res = await fetch(`${process.env.APP_URL ?? ''}/api/users/me`, { cache: 'no-store' });
  return res.ok ? res.json() : { ok: false };
}

export default async function Lobby() {
  const data = await fetchMe();
  const name = data?.user?.displayName ?? '玩家';
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#0a0d12', color: '#e7eaf0' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', letterSpacing: '0.1em' }}>TOPZCASINO</h1>
        <p style={{ opacity: .8, marginTop: 8 }}>歡迎回來，{name}</p>
      </div>
    </main>
  );
}

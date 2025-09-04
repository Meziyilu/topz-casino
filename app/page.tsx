// app/page.tsx  (Server Component)
import { headers, cookies } from 'next/headers';
import Link from 'next/link';

async function fetchMe() {
  const h = headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const base = `${proto}://${host}`;

  // 將登入 cookie 轉發給 API
  const cookieHeader = (await cookies()).toString();

  const res = await fetch(`${base}/api/users/me`, {
    method: 'GET',
    headers: { cookie: cookieHeader },
    // 大廳要即時，避免快取
    cache: 'no-store',
    // 若你的平台（如 Render）需要 keepalive 可加上，否則可省略
    // keepalive: true,
  });

  if (!res.ok) return null;
  return res.json();
}

export default async function Lobby() {
  const me = await fetchMe(); // <-- 這裡以前會炸，現在用絕對 URL + cookies OK

  return (
    <main style={{ padding: 24 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 800, letterSpacing: 1 }}>TOPZCASINO</div>
        <nav style={{ display: 'flex', gap: 12 }}>
          <Link href="/profile">個人</Link>
          <Link href="/wallet">錢包</Link>
          <Link href="/casino/baccarat">百家樂</Link>
          <Link href="/casino/sicbo">骰寶</Link>
        </nav>
      </header>

      <section>
        {me ? (
          <div>
            <p>歡迎回來，{me.displayName || me.email}</p>
            <p>錢包餘額：{me.balance}｜銀行餘額：{me.bankBalance}</p>
          </div>
        ) : (
          <div>
            <p>尚未登入，<Link href="/login">前往登入</Link></p>
          </div>
        )}
      </section>
    </main>
  );
}

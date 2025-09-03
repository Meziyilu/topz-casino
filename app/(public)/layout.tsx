export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body style={{ fontFamily: 'ui-sans-serif, system-ui', padding: 24 }}>
        <header style={{ marginBottom: 16 }}>
          <h1>Topzcasino</h1>
          <nav style={{ display: 'flex', gap: 12 }}>
            <a href="/">大廳</a>
            <a href="/login">登入</a>
            <a href="/register">註冊</a>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

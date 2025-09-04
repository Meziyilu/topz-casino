// app/(public)/layout.tsx
export const metadata = { title: 'TOPZCASINO', description: 'Lobby' };

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body style={{
        minHeight: '100svh',
        margin: 0,
        background:
          'radial-gradient(1200px 600px at 80% -20%, rgba(0,180,255,.12), transparent 60%),' +
          'radial-gradient(900px 500px at -10% 20%, rgba(180,0,255,.10), transparent 60%),' +
          'linear-gradient(180deg, #0b0f14 0%, #0a0c10 100%)',
        color: '#dce3ea',
        fontFamily: `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial`,
      }}>
        {children}
      </body>
    </html>
  );
}

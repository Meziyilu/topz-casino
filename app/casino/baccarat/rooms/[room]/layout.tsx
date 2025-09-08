export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head>
        <link rel="stylesheet" href="/styles/baccarat/baccarat-room.css" />
      </head>
      <body className="dark">{children}</body>
    </html>
  );
}

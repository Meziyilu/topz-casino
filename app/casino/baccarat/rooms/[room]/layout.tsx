export default function RoomLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className="dark">
      <head>
        {/* 這裡放你的房間專用 CSS（public 目錄對應網站根目錄） */}
        <link rel="stylesheet" href="/styles/baccarat/baccarat/baccarat-room.css" />
        {/* 如果上面多了一層 baccarat，改成正確的：/styles/baccarat/baccarat-room.css */}
        <meta name="robots" content="noindex" />
      </head>
      <body>{children}</body>
    </html>
  );
}

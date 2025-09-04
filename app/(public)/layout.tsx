export const metadata = { title: "TOPZCASINO - Auth" };

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head>
        <link rel="stylesheet" href="/styles/auth-theme.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}

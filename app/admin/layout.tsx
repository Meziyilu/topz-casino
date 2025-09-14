export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <head>
        <link rel="stylesheet" href="/styles/admin/admin-ui.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}

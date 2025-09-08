export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        {children}
        <link rel="stylesheet" href="/style/admin/baccarat.css" />
      </body>
    </html>
  );
}

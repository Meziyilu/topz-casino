export const metadata = { title: "Admin", description: "Casino Admin" };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="admin-body">
        {children}
        <link rel="stylesheet" href="/style/admin.css" />
      </body>
    </html>
  );
}

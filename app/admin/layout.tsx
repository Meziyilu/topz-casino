import "@/../public/styles/admin/admin.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="admin-layout">
          <aside className="admin-sidebar"> … </aside>
          <main className="admin-content">{children}</main>
        </div>
      </body>
    </html>
  );
}

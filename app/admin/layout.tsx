export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body style={{ background:"#0b0f1a", color:"#fff", minHeight:"100vh" }}>
        {children}
      </body>
    </html>
  );
}

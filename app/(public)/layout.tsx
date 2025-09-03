// app/(public)/layout.tsx
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="auth-wrap">
      {/* 背景層：純 CSS，不產生動態 id/節點 */}
      <div className="auth-bg" aria-hidden="true" />
      {/* LOGO 列：固定字樣，不用圖片/外部字型 */}
      <header className="auth-brand">
        <div className="brand">
          <span className="brand-crest">◆</span>
          <span className="brand-text">TOPZCASINO</span>
        </div>
      </header>
      {children}
    </main>
  );
}

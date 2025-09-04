// app/(public)/layout.tsx
import './auth-theme.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Topzcasino — Sign in',
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="auth-bg">
        {/* 置中加大的文字 LOGO（不放圖片） */}
        <header className="auth-header">
          <div className="brand">TOPZCASINO</div>
        </header>

        <main className="auth-main">
          {/* 子頁（/login、/register）會把自己的卡片塞進來 */}
          {children}
        </main>

        {/* 可選：頁腳版權 */}
        <footer className="auth-footer">
          <span>© {new Date().getFullYear()} Topzcasino</span>
        </footer>
      </body>
    </html>
  );
}

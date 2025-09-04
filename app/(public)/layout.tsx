import type { ReactNode } from 'react';
import './styles/auth-theme.css';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body className="auth-root">
        {/* 整片動畫背景 */}
        <div id="auth-bg" aria-hidden />

        {/* 置中加大的文字 LOGO */}
        <header className="auth-header">
          <h1 className="auth-logo">TOPZCASINO</h1>
        </header>

        {/* 內容區（置中） */}
        <main className="auth-main">
          {children}
        </main>
      </body>
    </html>
  );
}

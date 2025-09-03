// app/(public)/layout.tsx
import React from 'react';
import './auth-theme.css';

export const metadata = {
  title: 'TOPZCASINO — Sign in / Sign up',
  description: 'Secure login for Topzcasino',
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" suppressHydrationWarning>
      <body className="auth-root">
        {/* 背景層：微網格、柔光、雜訊 */}
        <div aria-hidden className="bg-grid" />
        <div aria-hidden className="bg-glow" />
        <div aria-hidden className="bg-noise" />

        <header className="auth-header">
          <div className="brand">
            <span className="brand-kern">TOPZCASINO</span>
          </div>
        </header>

        <main className="auth-main">
          {children}
        </main>

        <footer className="auth-footer">© {new Date().getFullYear()} TOPZCASINO</footer>
      </body>
    </html>
  );
}

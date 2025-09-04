// app/(public)/layout.tsx
import './auth.css';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        <div className="tc-bg">
          {/* 漂浮光暈 */}
          <div className="tc-glow tc-glow-1" />
          <div className="tc-glow tc-glow-2" />
          <div className="tc-glow tc-glow-3" />
          {/* 背景粒子 */}
          <div className="tc-stars" />
          {children}
        </div>
      </body>
    </html>
  );
}

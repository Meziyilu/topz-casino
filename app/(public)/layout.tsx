// app/(public)/layout.tsx
import "./auth-theme.css";
import type { ReactNode } from "react";

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-Hant">
      <body>
        {/* 只在 (public) 下作用的命名空間，避免全域污染 */}
        <div className="tc-auth">
          {children}
        </div>
      </body>
    </html>
  );
}

import "./globals.css";
import { ReactNode, useEffect, useState } from "react";

export const metadata = {
  title: "TOPZ Casino",
  description: "娛樂城 1.1.1",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh" suppressHydrationWarning>
      <body>
        {/* 主題容器 */}
        <ThemeWrapper>{children}</ThemeWrapper>
      </body>
    </html>
  );
}

/* ---------- 主題切換容器 ---------- */
function ThemeWrapper({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // 讀取 localStorage
    const t = (localStorage.getItem("theme") as "dark" | "light") || "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className={theme === "light" ? "bg-[#f5f7fb] text-[#0A0A0A] min-h-screen" : "bg-casino-bg text-white min-h-screen"}>
      {children}
    </div>
  );
}

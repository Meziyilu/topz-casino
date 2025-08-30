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
        <ThemeWrapper>{children}</ThemeWrapper>
      </body>
    </html>
  );
}

type Theme = "dark" | "light";

/* ---------- 主題切換容器（支援事件同步） ---------- */
function ThemeWrapper({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  // 初始同步
  useEffect(() => {
    const t = (localStorage.getItem("theme") as Theme) || "dark";
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  // 監聽來自切換元件的事件與跨分頁 storage 事件
  useEffect(() => {
    function onThemeChange(e: Event) {
      const detail = (e as CustomEvent).detail as Theme;
      setTheme(detail);
    }
    function onStorage(e: StorageEvent) {
      if (e.key === "theme" && e.newValue) {
        setTheme(e.newValue as Theme);
        document.documentElement.setAttribute("data-theme", e.newValue);
      }
    }
    window.addEventListener("theme-change", onThemeChange as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("theme-change", onThemeChange as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // 套用外層背景/文字顏色（其餘細節用 Tailwind class 照舊）
  const wrapperClass =
    theme === "light"
      ? "bg-[#f5f7fb] text-[#0A0A0A] min-h-screen"
      : "bg-casino-bg text-white min-h-screen";

  return <div className={wrapperClass}>{children}</div>;
}

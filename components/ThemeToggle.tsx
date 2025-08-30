"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  // 初始讀取
  useEffect(() => {
    const t = (localStorage.getItem("theme") as Theme) || "dark";
    setTheme(t);
  }, []);

  // 切換主題
  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    // 寫入 localStorage
    localStorage.setItem("theme", next);
    // 設置 <html data-theme=...>
    document.documentElement.setAttribute("data-theme", next);
    // 通知 layout 更新自身狀態（確保包裹容器 class 立即改變）
    window.dispatchEvent(new CustomEvent("theme-change", { detail: next }));
  }

  return (
    <button
      onClick={toggle}
      title={theme === "dark" ? "切換為淺色" : "切換為深色"}
      className="inline-flex items-center gap-2 rounded-xl px-3 py-2 border border-white/20 hover:border-white/40 transition bg-white/5"
    >
      <span className="text-sm">{theme === "dark" ? "深色" : "淺色"}</span>
      <span
        className="relative w-10 h-6 rounded-full bg-white/10 border border-white/20"
        aria-hidden
      >
        <span
          className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white/80 transition-all ${
            theme === "dark" ? "left-1" : "left-5"
          }`}
        />
      </span>
    </button>
  );
}

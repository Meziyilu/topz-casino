// components/ThemeToggle.tsx
"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const cur = (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
    setTheme(cur);
  }, []);

  const toggle = () => {
    const cur = (document.documentElement.getAttribute("data-theme") as Theme) || "dark";
    const next: Theme = cur === "dark" ? "light" : "dark";
    (window as any).__setTheme?.(next);
    setTheme(next);
  };

  return (
    <button
      onClick={toggle}
      className="px-3 py-2 rounded-md border border-white/20 hover:border-white/40 transition text-sm"
      title="切換主題"
    >
      {theme === "dark" ? "🌙 深色" : "🌤️ 淺色"}
    </button>
  );
}

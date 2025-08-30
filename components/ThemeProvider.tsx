// components/ThemeProvider.tsx
"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";
const THEME_KEY = "theme";

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<Theme>("dark");

  // 初次掛載：讀 localStorage，套到 <html>
  useEffect(() => {
    try {
      const saved = (localStorage.getItem(THEME_KEY) as Theme) || "dark";
      setTheme(saved);
      applyTheme(saved);
    } catch {
      applyTheme("dark");
    }
  }, []);

  // 主題變更：寫入 localStorage 並套用到 <html>
  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {}
  }, [theme]);

  // 對外提供事件與全域方法，讓任一地方都能切主題
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as Theme | undefined;
      if (detail === "dark" || detail === "light") setTheme(detail);
    };

    window.addEventListener("theme-change" as any, handler as any);
    (window as any).__setTheme = (t: Theme) => setTheme(t);

    return () => {
      window.removeEventListener("theme-change" as any, handler as any);
      delete (window as any).__setTheme;
    };
  }, []);

  return <>{children}</>;
}

function applyTheme(t: Theme) {
  const html = document.documentElement;
  // 1) data-attribute（若 Tailwind 有用 data-theme）
  html.setAttribute("data-theme", t);
  // 2) class 也同步（可用於 :root.light / .dark 的 CSS）
  html.classList.toggle("light", t === "light");
  html.classList.toggle("dark", t === "dark");
}

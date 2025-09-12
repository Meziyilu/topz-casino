// components/useCss.tsx
"use client";
import { useEffect } from "react";

/** 將 public/styles/... 的 CSS 以 <link> 動態掛進 <head> */
export function useCss(href: string) {
  useEffect(() => {
    const id = `css:${href}`;
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => { link.remove(); };
  }, [href]);
}

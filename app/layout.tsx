"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const CLICK_SRC = "/sounds/click.mp3"; // 確認檔案存在
const HOVER_SRC = "/sounds/hover.mp3";
const STORAGE_KEY = "sfx-muted";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(muted);

  const clickVolRef = useRef(0.55);
  const hoverVolRef = useRef(0.32);

  const clickBaseRef = useRef<HTMLAudioElement | null>(null);
  const hoverBaseRef = useRef<HTMLAudioElement | null>(null);
  const unlockedRef = useRef(false);

  // 是否為要播放聲音的互動元素
  const isSoundTarget = (node: Element | null) => {
    if (!node) return false;
    const el = node as HTMLElement;
    // 若明確關閉 data-sound
    if (el.closest('[data-sound="off"]')) return false;

    return !!(
      // 典型按鈕
      el.closest('button, [role="button"]') ||
      // 明確指定
      el.closest('[data-sound]') ||
      // 大廳遊戲卡
      el.closest('.lb-games a') ||
      // 社交常用元素
      el.closest('.s-btn, .s-icon-btn, .social-entry, .social-tab, .lb-btn')
    );
  };

  // 是否被禁用
  const isDisabled = (node: Element | null) => {
    if (!node) return false;
    const btn = (node as HTMLElement).closest('button') as HTMLButtonElement | null;
    if (btn && btn.disabled) return true;
    const aria = (node as HTMLElement).closest('[aria-disabled="true"]');
    return !!aria;
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const v = saved === "1";
        setMuted(v);
        mutedRef.current = v;
      }
    } catch {}
  }, []);

  useEffect(() => {
    mutedRef.current = muted;
    try {
      localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch {}
  }, [muted]);

  useEffect(() => {
    clickBaseRef.current = new Audio(CLICK_SRC);
    hoverBaseRef.current = new Audio(HOVER_SRC);
    if (clickBaseRef.current) {
      clickBaseRef.current.preload = "auto";
      clickBaseRef.current.volume = clickVolRef.current;
    }
    if (hoverBaseRef.current) {
      hoverBaseRef.current.preload = "auto";
      hoverBaseRef.current.volume = hoverVolRef.current;
    }

    const unlockOnce = () => {
      if (unlockedRef.current) return;
      unlockedRef.current = true;

      const warmUp = async (el: HTMLAudioElement | null) => {
        if (!el) return;
        try {
          el.currentTime = 0;
          await el.play();
          el.pause();
          el.currentTime = 0;
        } catch {}
      };
      warmUp(clickBaseRef.current);
      warmUp(hoverBaseRef.current);

      document.removeEventListener("pointerdown", unlockOnce);
    };
    document.addEventListener("pointerdown", unlockOnce, { passive: true });

    const onPointerDown = (e: PointerEvent) => {
      if (mutedRef.current) return;
      const target = e.target as HTMLElement;
      if (!isSoundTarget(target)) return;
      if (isDisabled(target)) return;

      const base = clickBaseRef.current;
      if (!base) return;

      const sfx = base.cloneNode() as HTMLAudioElement;
      sfx.volume = clickVolRef.current;
      sfx.currentTime = 0;
      void sfx.play().catch(() => {});
    };

    const hasMouse = matchMedia("(hover: hover)").matches && matchMedia("(pointer: fine)").matches;
    const onPointerEnter = (e: Event) => {
      if (!hasMouse || mutedRef.current) return;
      const target = e.target as HTMLElement;
      if (!isSoundTarget(target)) return;
      if (isDisabled(target)) return;

      const base = hoverBaseRef.current;
      if (!base) return;

      const sfx = base.cloneNode() as HTMLAudioElement;
      sfx.volume = hoverVolRef.current;
      sfx.currentTime = 0;
      void sfx.play().catch(() => {});
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (mutedRef.current) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      const target = e.target as HTMLElement;
      if (!isSoundTarget(target)) return;
      if (isDisabled(target)) return;

      const base = clickBaseRef.current;
      if (!base) return;

      const sfx = base.cloneNode() as HTMLAudioElement;
      sfx.volume = clickVolRef.current;
      sfx.currentTime = 0;
      void sfx.play().catch(() => {});
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointerenter", onPointerEnter, true);
    document.addEventListener("keydown", onKeyDown, { passive: true });

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerenter", onPointerEnter, true);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", unlockOnce);
    };
  }, []);

  return (
    <html lang="zh-Hant">
      <head>
        {/* 預載音效 */}
        <link rel="preload" as="audio" href={CLICK_SRC} />
        <link rel="preload" as="audio" href={HOVER_SRC} />

        {/* 既有樣式（保留你原本的） */}
        <link rel="stylesheet" href="/styles/shop.css" />
        <link rel="stylesheet" href="/styles/headframes.css" />
        <link rel="stylesheet" href="/styles/bank.css" />

        <style>{`
          .sfx-toggle {
            position: fixed;
            right: clamp(10px, 2vw, 18px);
            bottom: calc(clamp(10px, 3vh, 18px) + env(safe-area-inset-bottom));
            z-index: 60;
            border: 1px solid rgba(255,255,255,.16);
            border-radius: 12px;
            padding: 10px 12px;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            background: linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
            color: #eaf2ff;
            font-weight: 800;
            letter-spacing: .02em;
            box-shadow: 0 8px 18px rgba(0,0,0,.35);
            cursor: pointer;
          }
          .sfx-toggle:hover { transform: translateY(-1px); }
          .sfx-toggle .dot {
            display:inline-block; width:8px; height:8px; border-radius:999px;
            margin-left:8px; box-shadow: 0 0 8px currentColor;
          }
          .sfx-on .dot { background:#22c55e; color:#22c55e; }
          .sfx-off .dot { background:#f87171; color:#f87171; }
        `}</style>
      </head>
      <body>
        <button
          type="button"
          className={`sfx-toggle ${muted ? "sfx-off" : "sfx-on"}`}
          aria-label={muted ? "開啟音效" : "關閉音效"}
          onClick={() => setMuted((m) => !m)}
          data-sound
        >
          音效 {muted ? "關閉" : "開啟"} <span className="dot" />
        </button>

        {children}

        <Script
          id="tawk-embed"
          src="https://embed.tawk.to/68b349c7d19aeb19234310df/1j3u5gcnb"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

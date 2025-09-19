// app/layout.tsx
"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const CLICK_SRC = "/sounds/click.mp3"; // 可換成 .wav
const HOVER_SRC = "/sounds/hover.mp3"; // 可換成 .wav
const STORAGE_KEY = "sfx-muted";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // 全域靜音狀態（localStorage 記憶）
  const [muted, setMuted] = useState<boolean>(false);

  // 基底音源（用來 clone，避免連點卡住）
  const clickBaseRef = useRef<HTMLAudioElement | null>(null);
  const hoverBaseRef = useRef<HTMLAudioElement | null>(null);
  // 卷軸音量（若要做設定頁可拉到 state）
  const clickVolRef = useRef(0.5);
  const hoverVolRef = useRef(0.3);
  // 用 ref 保存當前靜音（事件 handler 讀取，避免閉包不同步）
  const mutedRef = useRef(muted);

  useEffect(() => {
    // 初始靜音狀態（從 localStorage）
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
    // 準備基底音效
    clickBaseRef.current = new Audio(CLICK_SRC);
    if (clickBaseRef.current) clickBaseRef.current.volume = clickVolRef.current;

    hoverBaseRef.current = new Audio(HOVER_SRC);
    if (hoverBaseRef.current) hoverBaseRef.current.volume = hoverVolRef.current;

    // 事件：按下（用 pointerdown 比 click 更即時，也能覆蓋滑鼠/觸控/筆）
    const onPointerDown = (e: PointerEvent) => {
      if (mutedRef.current) return;
      const el = (e.target as HTMLElement)?.closest("button, [data-sound]");
      if (!el) return;
      // 忽略 disabled button
      if (el instanceof HTMLButtonElement && el.disabled) return;

      const src = clickBaseRef.current;
      if (!src) return;

      const sfx = src.cloneNode() as HTMLAudioElement;
      sfx.volume = clickVolRef.current;
      sfx.currentTime = 0;
      void sfx.play().catch(() => {});
    };

    // 事件：滑入（用 pointerenter 取代 mouseover，避免子元素冒泡狂觸發）
    const onPointerEnter = (e: PointerEvent) => {
      if (mutedRef.current) return;
      const el = (e.target as HTMLElement);
      if (!el) return;
      // 只有剛進入目標元素時播；限定 button 或 data-sound
      const isTarget = el.matches("button, [data-sound]");
      if (!isTarget) return;
      if (el instanceof HTMLButtonElement && el.disabled) return;

      const src = hoverBaseRef.current;
      if (!src) return;

      const sfx = src.cloneNode() as HTMLAudioElement;
      sfx.volume = hoverVolRef.current;
      sfx.currentTime = 0;
      void sfx.play().catch(() => {});
    };

    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointerenter", onPointerEnter, true); // 捕獲階段讓 enter 穩定

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerenter", onPointerEnter, true);
    };
  }, []);

  return (
    <html lang="zh-Hant">
      <head>
        {/* 載入商店 / 頭框 / 銀行的樣式 */}
        <link rel="stylesheet" href="/styles/shop.css" />
        <link rel="stylesheet" href="/styles/headframes.css" />
        <link rel="stylesheet" href="/styles/bank.css" />

        {/* 小小樣式：音效開關按鈕 */}
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
        {/* 全域音效開關（顯示狀態、可切換） */}
        <button
          type="button"
          className={`sfx-toggle ${muted ? "sfx-off" : "sfx-on"}`}
          aria-label={muted ? "開啟音效" : "關閉音效"}
          onClick={() => setMuted((m) => !m)}
        >
          音效 {muted ? "關閉" : "開啟"}
          <span className="dot" />
        </button>

        {children}

        {/* afterInteractive：等可互動再載，避免阻塞渲染 */}
        <Script
          id="tawk-embed"
          src="https://embed.tawk.to/68b349c7d19aeb19234310df/1j3u5gcnb"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}

// components/CardFlip.tsx
"use client";

import { useEffect, useState } from "react";

type Props = {
  /** 顯示在背面（翻開後）的文字，例：A♠ / 9♦ / K♥ */
  backText: string;
  /** 還沒翻開前顯示的正面字（預設 ?） */
  frontText?: string;
  /** 延遲幾毫秒開始翻 */
  delay?: number;
  /** 是否加上贏家的金光外框 */
  highlight?: boolean;
  /** 自訂寬高（預設卡片 84 x 120） */
  w?: number;
  h?: number;
};

export default function CardFlip({
  backText,
  frontText = "?",
  delay = 0,
  highlight = false,
  w = 84,
  h = 120,
}: Props) {
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setFlipped(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className="flip-3d" style={{ width: w, height: h }}>
      <div
        className={`flip-inner ${flipped ? "rotate-y-180" : ""}`}
        style={{ width: "100%", height: "100%" }}
      >
        {/* 正面 */}
        <div
          className="flip-front glass flex items-center justify-center text-2xl font-bold"
          style={{
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.18)",
          }}
        >
          {frontText}
        </div>

        {/* 背面 */}
        <div
          className={`flip-back flex items-center justify-center text-2xl font-extrabold ${
            highlight ? "ring-2 ring-yellow-300/80 shadow-[0_0_28px_rgba(255,220,120,.55)]" : ""
          }`}
          style={{
            borderRadius: 12,
            background:
              "linear-gradient(135deg, rgba(255,255,255,.1), rgba(255,255,255,.06))",
            border: "1px solid rgba(255,255,255,.25)",
          }}
        >
          {backText}
        </div>
      </div>
    </div>
  );
}

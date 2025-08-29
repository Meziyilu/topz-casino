// components/CardFlip.tsx
"use client";

import { useEffect, useRef } from "react";

export default function CardFlip({
  label,       // "閒" | "莊"
  total,       // 總點數
  show,        // 何時翻面
  isWinner,    // 是否顯示金光外框
}: {
  label: "閒" | "莊";
  total: number;
  show: boolean;
  isWinner?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  // 當 show 變成 true 時，觸發一次翻面動畫
  useEffect(() => {
    if (!ref.current) return;
    if (show) {
      // 先移除再加上，確保每局都會重新播放
      ref.current.classList.remove("animate-[flipIn_.7s_ease_forwards]");
      // 強制 reflow
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      ref.current.offsetHeight;
      ref.current.classList.add("animate-[flipIn_.7s_ease_forwards]");
    }
  }, [show]);

  const frameClass =
    "rounded-2xl px-4 py-6 relative " +
    (label === "閒"
      ? "border border-cyan-300/50"
      : "border border-rose-300/50");

  return (
    <div className="flip-3d h-32">
      <div
        ref={ref}
        className="flip-inner"
        style={{ transform: show ? "rotateY(180deg)" : "none" }}
      >
        {/* 正面（未翻開） */}
        <div className={`flip-front glass ${frameClass} flex items-center justify-center`}>
          <div className="text-xl font-bold opacity-80">{label}</div>
        </div>

        {/* 背面（翻開顯示點數） */}
        <div
          className={`flip-back ${frameClass} flex items-center justify-center ${
            isWinner ? "winner-glow" : ""
          }`}
          style={{
            background:
              label === "閒"
                ? "linear-gradient(135deg, rgba(103,232,249,.12), rgba(255,255,255,.06))"
                : "linear-gradient(135deg, rgba(253,164,175,.12), rgba(255,255,255,.06))",
          }}
        >
          <div className="text-3xl font-extrabold tracking-widest">
            {Number.isFinite(total) ? total : 0} 點
          </div>
        </div>
      </div>
    </div>
  );
}

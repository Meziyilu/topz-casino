"use client";

import { useEffect, useState } from "react";

type Props = {
  label: "PLAYER" | "BANKER";
  total: number | null;                      // null = 未開牌
  outcome: "PLAYER" | "BANKER" | "TIE" | null;
  triggerKey: string;                        // 每局/相位改變觸發翻牌
};

export default function FlipTile({ label, total, outcome, triggerKey }: Props) {
  const isPlayer = label === "PLAYER";
  const colorClass = isPlayer ? "from-cyan-400/20 to-cyan-300/10" : "from-rose-400/20 to-rose-300/10";
  const ringClass  = isPlayer ? "ring-cyan-300/40" : "ring-rose-300/40";

  const [flipped, setFlipped] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // 每次 triggerKey 變化，重置動畫
    setFlipped(false);
    setRevealed(false);

    // 延遲觸發卡片翻面
    const t1 = setTimeout(() => setFlipped(true), 150);
    // 再延遲把數字亮出來
    const t2 = setTimeout(() => setRevealed(true), 700);

    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [triggerKey]);

  // 結果高亮
  const winGlow =
    outcome && ((outcome === "PLAYER" && isPlayer) || (outcome === "BANKER" && !isPlayer))
      ? "shadow-[0_0_40px_rgba(255,255,255,0.25)]"
      : "";

  return (
    <div className="flip-3d w-full max-w-sm">
      <div
        className={`flip-inner ${flipped ? "rotate-y-180" : ""}`}
        style={{ width: "100%", height: "220px" }}
      >
        {/* 正面：未開牌/背面 */}
        <div className="flip-front glass sheen glow-ring ring-1 ring-white/10 p-5 flex flex-col items-center justify-center"
             style={{ backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))` }}>
          <div className={`text-sm tracking-widest opacity-80 mb-2 ${isPlayer ? "text-cyan-200" : "text-rose-200"}`}>
            {isPlayer ? "閒" : "莊"}
          </div>
          <div className="w-24 h-36 rounded-lg bg-gradient-to-br from-white/30 to-white/10 border border-white/30 shadow-inner flex items-center justify-center">
            <div className="w-14 h-24 rounded bg-white/70 border border-white/90" />
          </div>
        </div>

        {/* 背面：已開牌 */}
        <div className={`flip-back glass ring-1 ${ringClass} p-5 flex flex-col items-center justify-center bg-gradient-to-br ${colorClass} ${winGlow}`}>
          <div className={`text-sm tracking-widest mb-2 ${isPlayer ? "text-cyan-200" : "text-rose-200"}`}>
            {isPlayer ? "閒" : "莊"}
          </div>
          <div className="w-24 h-36 rounded-lg bg-white/90 border border-white/90 shadow-lg grid place-items-center">
            <span className={`text-5xl font-black ${revealed ? "opacity-100 scale-100" : "opacity-0 scale-90"} transition-all duration-300`}>
              {total ?? "?"}
            </span>
          </div>
          {outcome === "TIE" && (
            <div className="mt-3 text-yellow-200 text-xs tracking-widest">平局</div>
          )}
        </div>
      </div>
    </div>
  );
}

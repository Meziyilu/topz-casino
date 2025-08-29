// components/FlipTile.tsx
"use client";

import React from "react";

type Props = {
  front?: React.ReactNode;   // 未翻開（下注中時可顯示背面）
  back?: React.ReactNode;    // 翻開/結算後顯示
  flipped?: boolean;         // true=已翻開
  className?: string;
};

export default function FlipTile({ front, back, flipped, className }: Props) {
  return (
    <div className={`flip-3d ${className || ""}`}>
      <div className="flip-inner" style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}>
        <div className="flip-front glass flip-face flex items-center justify-center">
          {front || <div className="text-white/60 text-sm">隱藏</div>}
        </div>
        <div className="flip-back glass flip-face flex items-center justify-center">
          {back || <div className="text-white/90 font-semibold">結果</div>}
        </div>
      </div>
    </div>
  );
}

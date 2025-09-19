"use client";

import { cn } from "../../lib/utils";
import { HTMLAttributes } from "react";

export type HeadframeCode = "NONE" | "GOLD" | "NEON" | "CRYSTAL" | "DRAGON";

type Props = {
  code: HeadframeCode;
  selected?: boolean;
  locked?: boolean;
  onClick?: () => void;
  avatarUrl?: string; // ← 新增：顯示玩家頭像用
} & Omit<HTMLAttributes<HTMLDivElement>, "onClick">;

const FRAME_STYLE: Record<HeadframeCode, string> = {
  NONE: "ring-0",
  GOLD: "ring-2 ring-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.35)]",
  NEON: "ring-2 ring-fuchsia-400 shadow-[0_0_20px_rgba(232,121,249,0.35)]",
  CRYSTAL: "ring-2 ring-cyan-300 shadow-[0_0_20px_rgba(103,232,249,0.35)]",
  DRAGON: "ring-2 ring-amber-400 shadow-[0_0_24px_rgba(251,191,36,0.45)]",
};

const NAME: Record<HeadframeCode, string> = {
  NONE: "無頭框",
  GOLD: "黃金",
  NEON: "霓虹",
  CRYSTAL: "水晶",
  DRAGON: "龍紋",
};

// 內嵌 SVG 當佔位圖（不依賴任何檔案）
const PLACEHOLDER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#0f172a"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <circle cx="80" cy="64" r="28" fill="#334155"/>
      <rect x="40" y="102" width="80" height="30" rx="15" fill="#334155"/>
    </svg>`
  );

export function HeadframeCard({
  code,
  selected,
  locked,
  onClick,
  className,
  avatarUrl,
  ...rest
}: Props) {
  return (
    <div
      role="button"
      onClick={locked ? undefined : onClick}
      className={cn(
        "group relative cursor-pointer rounded-2xl p-3 transition",
        locked ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.99]",
        selected ? "bg-white/5" : "bg-white/2",
        className
      )}
      {...rest}
    >
      <div
        className={cn(
          "mx-auto aspect-square w-20 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 ring-offset-2",
          FRAME_STYLE[code],
          selected && "ring-offset-cyan-300"
        )}
      >
        <img
          src={avatarUrl || PLACEHOLDER_SVG}
          alt="avatar"
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>

      <div className="mt-3 text-center text-sm text-slate-200">
        <div className="font-medium">{NAME[code]}</div>
        {locked ? (
          <div className="text-xs text-slate-400">尚未擁有</div>
        ) : selected ? (
          <div className="text-xs text-cyan-300">已裝備</div>
        ) : (
          <div className="text-xs text-slate-400">點擊裝備</div>
        )}
      </div>

      {selected && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-cyan-300/60" />
      )}
    </div>
  );
}

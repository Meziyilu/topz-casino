"use client";

import { cn } from "../../lib/utils";
import { HTMLAttributes } from "react";

export type HeadframeCode = "NONE" | "GOLD" | "NEON" | "CRYSTAL" | "DRAGON";

type Props = {
  code: HeadframeCode;
  selected?: boolean;
  locked?: boolean;
  onClick?: () => void;
  avatarUrl?: string; // 玩家頭像（可選）
} & Omit<HTMLAttributes<HTMLDivElement>, "onClick">;

const FRAME_STYLE: Record<HeadframeCode, string> = {
  NONE: "ring-0",
  GOLD: "ring-2 ring-yellow-400 shadow-[0_0_14px_rgba(250,204,21,0.28)]",
  NEON: "ring-2 ring-fuchsia-400 shadow-[0_0_14px_rgba(232,121,249,0.28)]",
  CRYSTAL: "ring-2 ring-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.28)]",
  DRAGON: "ring-2 ring-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.36)]",
};

const NAME: Record<HeadframeCode, string> = {
  NONE: "無頭框",
  GOLD: "黃金",
  NEON: "霓虹",
  CRYSTAL: "水晶",
  DRAGON: "龍紋",
};

// 內嵌 SVG 佔位圖（無需放檔案）
const PLACEHOLDER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#1e293b"/><stop offset="1" stop-color="#0f172a"/>
      </linearGradient></defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
      <circle cx="100" cy="78" r="34" fill="#334155"/>
      <rect x="52" y="128" width="96" height="36" rx="18" fill="#334155"/>
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
        // 固定卡片寬高，避免版面跳動；在不同螢幕仍可塞五張（grid 控制列數）
        "relative flex w-[112px] flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-3",
        "transition-transform hover:scale-[1.02] active:scale-[0.99]",
        locked && "opacity-55 cursor-not-allowed",
        selected && "border-cyan-300/50 bg-white/[0.07]",
        className
      )}
      {...rest}
    >
      {/* 頭像預覽容器：固定正方形，不會被大圖撐爆 */}
      <div
        className={cn(
          "relative aspect-square w-[84px] overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-slate-800 to-slate-900 ring-offset-2",
          FRAME_STYLE[code],
          selected && "ring-offset-cyan-300"
        )}
      >
        <img
          src={avatarUrl || PLACEHOLDER_SVG}
          alt="avatar"
          className="h-full w-full object-cover object-center select-none"
          draggable={false}
        />

        {/* 已裝備角標 */}
        {selected && (
          <div className="absolute right-1 top-1 rounded-md bg-cyan-500/90 px-1.5 py-[2px] text-[10px] font-semibold text-white">
            已裝備
          </div>
        )}

        {/* 鎖定遮罩 */}
        {locked && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-slate-900/40 text-[11px] text-slate-200">
            未擁有
          </div>
        )}
      </div>

      {/* 名稱＋狀態：固定高度，避免文字行數差造成高度不一致 */}
      <div className="mt-2 h-[34px] w-full text-center">
        <div className="truncate text-[13px] font-medium text-slate-100">{NAME[code]}</div>
        {!locked && !selected && (
          <div className="text-[11px] text-slate-400">點擊預覽</div>
        )}
        {locked && <div className="text-[11px] text-slate-400">尚未擁有</div>}
      </div>

      {/* 外框高亮 */}
      {selected && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-cyan-300/40" />
      )}
    </div>
  );
}

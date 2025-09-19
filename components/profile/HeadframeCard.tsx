"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { HTMLAttributes } from "react";

export type HeadframeCode = "NONE" | "GOLD" | "NEON" | "CRYSTAL" | "DRAGON";

type Props = {
  code: HeadframeCode;
  selected?: boolean;
  locked?: boolean;
  onClick?: () => void;
} & Omit<HTMLAttributes<HTMLDivElement>, "onClick">;

// 依不同頭框定義邊框/發光風格（可再微調）
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

export function HeadframeCard({ code, selected, locked, onClick, className, ...rest }: Props) {
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
      {/* 頭像容器（示意）：你可以換成玩家頭像 */}
      <div
        className={cn(
          "mx-auto aspect-square w-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 ring-offset-2",
          FRAME_STYLE[code],
          selected && "ring-offset-cyan-300"
        )}
      >
        {/* 可放玩家頭像 */}
        <Image
          src="/avatar-placeholder.png" // 提供一張占位圖 /public/avatar-placeholder.png
          alt="avatar"
          width={160}
          height={160}
          className="h-full w-full rounded-2xl object-cover"
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

      {/* 選取高亮 */}
      {selected && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-cyan-300/60" />
      )}
    </div>
  );
}

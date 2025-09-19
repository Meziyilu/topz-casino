"use client";

import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type HeadframeCode = "NONE" | "GOLD" | "NEON" | "CRYSTAL" | "DRAGON";

type Props = {
  code: HeadframeCode;
  selected?: boolean;
  locked?: boolean;
  onClick?: () => void;
  avatarUrl?: string;
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
        "hf-card", // 🔒 讓 profile.css 的尺寸鎖能抓到
        "relative flex w-[118px] flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-3",
        "transition-transform hover:scale-[1.02] active:scale-[0.99]",
        "select-none",
        locked && "opacity-55 cursor-not-allowed",
        selected && "border-cyan-300/50 bg-white/[0.07]",
        className
      )}
      {...rest}
    >
      <div
        className={cn(
          "hf-ava", // 🔒 讓 profile.css 的尺寸鎖能抓到
          "relative aspect-square w-[88px] overflow-hidden rounded-2xl",
          "bg-gradient-to-br from-slate-800 to-slate-900 ring-offset-2",
          FRAME_STYLE[code],
          selected && "ring-offset-cyan-300"
        )}
      >
        <img
          src={avatarUrl || PLACEHOLDER_SVG}
          alt="avatar"
          className="h-full w-full object-cover object-center pointer-events-none"
          draggable={false}
        />

        {selected && (
          <div className="absolute right-1 top-1 rounded-md bg-cyan-500/90 px-1.5 py-[2px] text-[10px] font-semibold text-white">
            已裝備
          </div>
        )}
        {locked && (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-slate-900/40 text-[11px] text-slate-200">
            未擁有
          </div>
        )}
      </div>

      <div className="mt-2 h-[34px] w-full text-center">
        <div className="truncate text-[13px] font-medium text-slate-100">{NAME[code]}</div>
        {!locked && !selected && <div className="text-[11px] text-slate-400">點擊預覽</div>}
        {locked && <div className="text-[11px] text-slate-400">尚未擁有</div>}
      </div>

      {selected && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-cyan-300/40" />
      )}
    </div>
  );
}

export default HeadframeCard;

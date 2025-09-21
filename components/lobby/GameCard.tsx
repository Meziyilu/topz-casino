"use client";

import Link from "next/link";
import { ReactNode } from "react";

type Props = {
  title: string;
  online?: number;
  countdown?: number;
  href: string;
  disabled?: boolean;
  children?: ReactNode;   // ✅ 新增
};

export default function GameCard({ title, online, countdown, href, disabled, children }: Props) {
  return (
    <Link href={href} className={`game-card ${disabled ? "disabled" : ""}`}>
      <div className="gc-title">{title}</div>
      {typeof online === "number" && <div className="gc-online">在線 {online}</div>}
      {typeof countdown === "number" && <div className="gc-countdown">倒數 {countdown}s</div>}
      
      {/* ✅ 讓外部可以插入 Lottie 或其他元素 */}
      {children && <div className="gc-extra">{children}</div>}
    </Link>
  );
}

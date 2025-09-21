"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { memo } from "react";

const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

type Props = {
  online?: number;
  countdown?: number; // 秒
  href?: string;      // 預設 /casino/roulette
  title?: string;     // 預設「輪盤」
};

function _RouletteCard({ online = 0, countdown = 0, href = "/casino/roulette", title = "輪盤" }: Props) {
  return (
    <Link href={href} className="lb-gamecard lb-roulette">
      <div className="lb-gamecard__media">
        <div className="lottie-wrap glow">
          <Lottie
            animationData={require("@/public/lotties/roulette.json")}
            loop
            autoplay
            style={{ width: 260, height: 260 }}  // ⬅ 稍微大一點
          />
          <div className="lottie-pin" aria-hidden />
        </div>
      </div>

      <div className="lb-gamecard__meta">
        <div className="lb-gamecard__title">{title}</div>
        <div className="lb-gamecard__stats">
          <span className="stat">
            在線 <b>{online}</b>
          </span>
          <span className="stat">
            倒數 <b>{Math.max(0, Math.floor(countdown))}</b>s
          </span>
        </div>
      </div>
    </Link>
  );
}

export default memo(_RouletteCard);

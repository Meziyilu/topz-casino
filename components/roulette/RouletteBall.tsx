"use client";

import { useEffect, useMemo, useRef } from "react";

type Phase = "BETTING" | "REVEALING" | "SETTLED";

/**
 * 玻璃風輪盤 + 珠子動畫
 * - BETTING: 緩慢繞圈
 * - REVEALING: 10s 減速停到 result
 * - SETTLED: 停在 result
 */
export default function RouletteBall({
  size = 320,
  phase = "BETTING",
  result,               // 0~36
  onRevealEnd,
  wheelSrc = "/images/roulette/wheel.png",
  ballSrc  = "/images/roulette/ball.png",
}: {
  size?: number;
  phase?: Phase;
  result?: number | null;
  onRevealEnd?: () => void;
  wheelSrc?: string;
  ballSrc?: string;
}) {
  const orbitRef = useRef<HTMLDivElement>(null);

  // 歐輪順序（單零，從 0 頂端順時針）
  const order = useMemo<number[]>(
    () => [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26],
    []
  );

  // 一格角度
  const step = 360 / order.length;

  // 目標角度（讓球停在畫面正上方）
  const targetDeg = useMemo(() => {
    if (result == null) return 0;
    const idx = order.indexOf(result);
    if (idx < 0) return 0;
    // 讓該號碼轉到「12 點方向」：index * step
    return idx * step;
  }, [result, order, step]);

  // 切換動畫
  useEffect(() => {
    const el = orbitRef.current;
    if (!el) return;

    // 清掉舊動畫狀態
    el.classList.remove("rb-reveal", "rb-settled");

    if (phase === "BETTING") {
      // 持續慢轉
      el.style.setProperty("--spin-to", `0deg`);
    } else if (phase === "REVEALING") {
      // 以 10s 從多圈旋轉到目標角度（減速）
      // 多加幾圈讓視覺更像逐漸減速
      const to = 1080 + targetDeg; // 3 圈 + 目標
      el.style.setProperty("--spin-to", `${to}deg`);
      // 觸發 reveal 動畫
      void el.offsetWidth; // reflow
      el.classList.add("rb-reveal");

      const handler = () => onRevealEnd?.();
      el.addEventListener("animationend", handler, { once: true });
      return () => el.removeEventListener("animationend", handler);
    } else if (phase === "SETTLED") {
      // 停在結果
      el.style.setProperty("--spin-to", `${targetDeg}deg`);
      el.classList.add("rb-settled");
    }
  }, [phase, targetDeg, onRevealEnd]);

  return (
    <div className="rb-wrap" style={{ ["--rb-size" as any]: `${size}px` }}>
      {/* 盤面 */}
      <div className="rb-wheel">
        <img src={wheelSrc} alt="roulette wheel" />
      </div>

      {/* 球的軌道（實際旋轉的是這一層） */}
      <div ref={orbitRef} className="rb-orbit">
        <div className="rb-ball">
          <img src={ballSrc} alt="ball" />
        </div>
      </div>

      <style jsx>{`
        .rb-wrap {
          position: relative;
          width: var(--rb-size);
          height: var(--rb-size);
          border-radius: 16px;
          padding: 16px;
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(10px) saturate(120%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 10px 30px rgba(0,0,0,.35);
          overflow: hidden;
        }
        .rb-wheel {
          position: absolute;
          inset: 16px;
          border-radius: 12px;
          display: grid;
          place-items: center;
        }
        .rb-wheel img {
          width: calc(var(--rb-size) - 32px);
          height: calc(var(--rb-size) - 32px);
          object-fit: contain;
          pointer-events: none;
          user-select: none;
          filter: drop-shadow(0 6px 14px rgba(0,0,0,.4));
        }

        /* 球的軌道層：旋轉它，就像球在繞圈 */
        .rb-orbit {
          --radius: calc((var(--rb-size) - 32px) / 2 - 18px); /* 盤直徑的一半再扣球半徑 */
          position: absolute;
          inset: 16px;
          transform: rotate(0deg);
          transform-origin: 50% 50%;
          will-change: transform;
          /* BETTING 狀態的慢速無限轉（預設） */
          animation: rb-idle 3.2s linear infinite;
        }
        @keyframes rb-idle {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }

        /* REVEALING：10s 減速到目標角度 */
        .rb-orbit.rb-reveal {
          animation: rb-reveal 10s cubic-bezier(.08,.45,.21,1) forwards;
        }
        @keyframes rb-reveal {
          from { transform: rotate(0deg); }
          to   { transform: rotate(var(--spin-to)); }
        }

        /* SETTLED：直接定格在目標角度 */
        .rb-orbit.rb-settled {
          animation: none;
          transform: rotate(var(--spin-to));
        }

        /* 球放在軌道「正上方」，跟著父層旋轉 */
        .rb-ball {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 28px;
          height: 28px;
          margin-left: -14px; /* 置中 */
          margin-top: calc(-1 * var(--radius) - 14px); /* 往上推到軌道 */
          border-radius: 50%;
          overflow: hidden; /* 把 ball.png 多餘白邊裁掉 */
          box-shadow: 0 6px 10px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.25);
          background: radial-gradient(ellipse at 30% 30%, rgba(255,255,255,.9), rgba(210,210,210,.9));
        }
        .rb-ball img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
          display: block;
          pointer-events: none;
          user-select: none;
          opacity: .9;
        }
      `}</style>
    </div>
  );
}
